// Game.js (修正版)
import * as UI from './UI.js';
import { findBestMove } from './AI.js';

const BOARD_SIZE = 8;
const BOARD_CELLS = BOARD_SIZE * BOARD_SIZE;

// 8方向の差分 [dy, dx]
const DIRECTIONS = [
    [-1, 0], [1, 0], [0, -1], [0, 1], 
    [-1, -1], [-1, 1], [1, -1], [1, 1]
];

export class Game {
    constructor(cellClickHandler, endGameCallback, undoButton) {
        this.board = Array(BOARD_CELLS).fill(null);
        this.currentPlayer = 'B'; 
        this.isGameActive = false;
        this.isAImode = false;
        this.AI_PLAYER = 'W';
        this.HUMAN_PLAYER = 'B';
        this.AI_MAX_DEPTH = 3;
        this.AI_LEVEL_LABEL = '中級';
        this.score = { B: 0, W: 0, Draw: 0 };
        this.history = []; 
        this.timerInterval = null; 
        this.cellClickHandler = cellClickHandler;
        this.endGameCallback = endGameCallback;
        this.undoButton = undoButton;
        this.isProcessingMove = false;
    }

    // --- ユーティリティ関数 ---
    toCoord(index) { return { y: Math.floor(index / BOARD_SIZE), x: index % BOARD_SIZE }; }
    toIndex(y, x) { 
        if (y < 0 || y >= BOARD_SIZE || x < 0 || x >= BOARD_SIZE) return -1;
        return y * BOARD_SIZE + x;
    }

    getFlippableStones(board, index, player) {
        const { y, x } = this.toCoord(index);
        if (board[index] !== null) return [];
        const opponent = player === 'B' ? 'W' : 'B';
        let flippable = [];
        for (const [dy, dx] of DIRECTIONS) {
            let line = [];
            for (let i = 1; i < BOARD_SIZE; i++) {
                const ny = y + dy * i;
                const nx = x + dx * i;
                const ni = this.toIndex(ny, nx);
                if (ni === -1 || board[ni] === null) { line = []; break; }
                if (board[ni] === opponent) { line.push(ni); } 
                else if (board[ni] === player) { flippable = flippable.concat(line); break; }
            }
        }
        return flippable;
    }

    getValidMoves(board, player) {
        const validMoves = [];
        for (let i = 0; i < BOARD_CELLS; i++) {
            if (board[i] === null && this.getFlippableStones(board, i, player).length > 0) {
                validMoves.push(i);
            }
        }
        return validMoves;
    }
    
    getCurrentStoneCount() {
        const counts = { B: 0, W: 0, Draw: 0 };
        this.board.forEach(cell => {
            if (cell === 'B') counts.B++;
            if (cell === 'W') counts.W++;
        });
        return counts;
    }

    // --- ゲーム操作 ---

    startNewRound(resetScore = false) {
        this.board.fill(null);
        this.board[this.toIndex(3, 3)] = 'W'; this.board[this.toIndex(3, 4)] = 'B';
        this.board[this.toIndex(4, 3)] = 'B'; this.board[this.toIndex(4, 4)] = 'W';

        this.isGameActive = true;
        this.currentPlayer = 'B';
        this.history = []; 
        this.resetTimer(); 
        
        UI.createBoard(this.cellClickHandler, BOARD_SIZE);
        
        // ★修正: リスタート時に終盤演出（赤枠）を確実にオフにする
        if (typeof UI.toggleFinalCountdown === 'function') {
            UI.toggleFinalCountdown(false);
        }

        this.board.forEach((player, index) => {
             if (player) UI.renderMove(index, player);
        });

        if (resetScore) { this.score = { B: 0, W: 0, Draw: 0 }; }
        
        UI.updateScoreboard(this.getCurrentStoneCount(), this.isAImode, this.HUMAN_PLAYER, null, this.AI_LEVEL_LABEL);
        UI.updateInfo(`最初の番は ${this.currentPlayer} (黒) です`);
        UI.updateLog(null, null);
        UI.updateHints(this.getValidMoves(this.board, this.currentPlayer));
        this.updateUndoButton(); 
        this.startTimer(); 

        if (this.isAImode && this.currentPlayer === this.AI_PLAYER) {
            this.makeAIMove(true);
        }
    }

    makeMove(index) {
        if (!this.isGameActive || this.board[index] !== null || this.isProcessingMove) return false;

        const flippable = this.getFlippableStones(this.board, index, this.currentPlayer);
        if (flippable.length === 0) {
            UI.updateInfo('そこには置けません。');
            UI.showInvalidMoveError(index);
            return false;
        }
        
        this.isProcessingMove = true;
        this.saveHistory(index);
        this.updateUndoButton();
        
        const placedPlayer = this.currentPlayer;
        const placedIndex = index;
        
        this.board[index] = placedPlayer;
        UI.renderMove(index, placedPlayer);
        
        let flipDelay = 0;
        flippable.forEach(i => {
            setTimeout(() => {
                this.board[i] = placedPlayer;
                UI.renderFlip(i, placedPlayer);
                UI.updateLiveScore(this.getCurrentStoneCount());
            }, flipDelay);
            flipDelay += 100;
        });
        
        setTimeout(() => {
            this.isProcessingMove = false;
            UI.updateLog(placedPlayer, this.toCoord(placedIndex));
            this.switchTurn();
        }, flipDelay + 50); 

        return true;
    }
    
    switchTurn() {
        const nextPlayer = this.currentPlayer === 'B' ? 'W' : 'B';
        const nextPlayerMoves = this.getValidMoves(this.board, nextPlayer);
        const currentPlayerMoves = this.getValidMoves(this.board, this.currentPlayer);
        const currentStoneCount = this.getCurrentStoneCount();
        
        // ★修正: 残りマス数をチェックして終盤演出（赤枠）を切り替え
        const emptyCells = BOARD_CELLS - (currentStoneCount.B + currentStoneCount.W);
        if (typeof UI.toggleFinalCountdown === 'function') {
            UI.toggleFinalCountdown(emptyCells <= 16 && emptyCells > 0);
        }

        this.resetTimer();

        if (currentStoneCount.B + currentStoneCount.W === BOARD_CELLS || 
            (nextPlayerMoves.length === 0 && currentPlayerMoves.length === 0)) {
            this.endGame();
            return;
        }

        if (nextPlayerMoves.length > 0) {
            this.currentPlayer = nextPlayer;
            
            // ★修正: ターン交代アニメーションを実行
            if (typeof UI.animateTurnChange === 'function') {
                UI.animateTurnChange(this.currentPlayer);
            }

            UI.updateScoreboard(currentStoneCount, this.isAImode, this.HUMAN_PLAYER, null, this.AI_LEVEL_LABEL);
            UI.updateHints(this.getValidMoves(this.board, this.currentPlayer));
            this.startTimer(); 

            if (this.isAImode && this.currentPlayer === this.AI_PLAYER) {
                this.makeAIMove(false); 
            } else {
                UI.updateInfo(`あなたの番です (${this.HUMAN_PLAYER === this.currentPlayer ? 'あなた' : this.currentPlayer})`);
            }
        } else {
            // --- パス処理 ---
            const passMsg = `${nextPlayer}は置ける場所がありません。パスします。`;
            UI.updateInfo(passMsg);

            // ★修正: あなた（人間）がパスになる場合、必ずアラートを出して通知する
            if (this.isAImode && nextPlayer === this.HUMAN_PLAYER) {
                alert(passMsg);
            }

            this.startTimer(); 
            
            if (this.isAImode && this.currentPlayer === this.AI_PLAYER) {
                // AIの手番が続く場合（パス直後なので少しだけ間を空ける）
                setTimeout(() => {
                    this.makeAIMove(true); 
                }, 300);
            }
        }
    }

    makeAIMove(isInitialTurn) {
        if (!this.isGameActive || this.isProcessingMove) return;
        this.isProcessingMove = true;
        
        UI.updateInfo('AIの番です...');
        UI.updateHints([]); 

        const startDelay = isInitialTurn ? 0 : 500;

        setTimeout(() => {
            UI.showThinkingIndicator();

            const bestMove = findBestMove(this.board, this.AI_PLAYER, this.HUMAN_PLAYER, this.AI_MAX_DEPTH);
            
            UI.hideThinkingIndicator();
            
            if (bestMove !== null) {
                UI.highlightCell(bestMove, 2000); 

                setTimeout(() => {
                    this.isProcessingMove = false;
                    this.makeMove(bestMove); 
                }, 1000); 
                
            } else {
                 this.isProcessingMove = false;
                 this.switchTurn(); 
            }
        }, startDelay);
    }
    
    saveHistory(moveIndex) {
        this.history.push({
            board: [...this.board],
            currentPlayer: this.currentPlayer,
            lastMoveIndex: moveIndex
        });
    }

    undo() {
        if (!this.isGameActive || this.history.length === 0) return;
        
        let stepsToUndo = this.isAImode ? 2 : 1;
        
        if (this.isAImode && this.history.length === 1 && this.currentPlayer === this.AI_PLAYER) {
             stepsToUndo = 1;
        } else if (this.isAImode && this.history.length < 2) {
             stepsToUndo = 1;
        }

        for (let i = 0; i < stepsToUndo; i++) {
            if (this.history.length === 0) break;
            const prevState = this.history.pop();
            this.board = prevState.board;
            this.currentPlayer = prevState.currentPlayer;
        }
        
        UI.createBoard(this.cellClickHandler, BOARD_SIZE); 
        this.board.forEach((player, index) => {
            if (player) UI.renderMove(index, player); 
        });
        
        const currentStoneCount = this.getCurrentStoneCount();
        UI.updateScoreboard(currentStoneCount, this.isAImode, this.HUMAN_PLAYER, null, this.AI_LEVEL_LABEL);
        UI.updateInfo(`一手戻しました。${this.currentPlayer} の番です。`);
        UI.updateHints(this.getValidMoves(this.board, this.currentPlayer));
        this.updateUndoButton();
        this.resetTimer();
        this.startTimer();
    }
    
    updateUndoButton() {
        const minHistory = this.isAImode ? 2 : 1;
        this.undoButton.disabled = this.history.length < minHistory;
    }

    startTimer() {
        let seconds = 0;
        const timerElement = document.getElementById('turn-timer');
        this.timerInterval = setInterval(() => {
            seconds++;
            const min = String(Math.floor(seconds / 60)).padStart(2, '0');
            const sec = String(seconds % 60).padStart(2, '0');
            timerElement.textContent = `${min}:${sec}`;
        }, 3000);
    }

    resetTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        document.getElementById('turn-timer').textContent = '00:00';
    }

    endGame() {
        this.isGameActive = false;
        this.resetTimer(); 
        this.undoButton.disabled = true; 
        
        const finalScore = this.getCurrentStoneCount();
        const scoreB = finalScore.B;
        const scoreW = finalScore.W;
        
        let winnerMessage;
        if (scoreB > scoreW) {
            this.score.B++;
            winnerMessage = this.isAImode && this.HUMAN_PLAYER === 'B' ? 'あなたの勝利です！🎉' : '黒 (B) の勝利です！🎉';
        } else if (scoreW > scoreB) {
            this.score.W++;
            winnerMessage = this.isAImode && this.HUMAN_PLAYER === 'W' ? 'あなたの勝利です！🎉' : '白 (W) の勝利です！🎉';
        } else {
            this.score.Draw++;
            winnerMessage = '引き分けです。🤝';
        }
        
        UI.updateScoreboard(this.score, this.isAImode, this.HUMAN_PLAYER, { finalB: scoreB, finalW: scoreW }, this.AI_LEVEL_LABEL);
        UI.updateInfo(winnerMessage);
        
        this.endGameCallback(winnerMessage, scoreB, scoreW);
    }
}
