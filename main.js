// main.js
import { ScreenManager } from './ScreenManager.js';
import { Game } from './Game.js';

// DOM要素の取得
const MODE_AI_BUTTON = document.getElementById('mode-ai');
const MODE_TWO_PLAYER_BUTTON = document.getElementById('mode-two-player');
const START_AI_BUTTON = document.getElementById('start-ai-button');
const START_TWO_PLAYER_BUTTON = document.getElementById('start-two-player-button');
const RESTART_BUTTON = document.getElementById('restart-button');
const HOME_BUTTON = document.getElementById('home-button');
const UNDO_BUTTON = document.getElementById('undo-button'); // 新機能6

// 設定要素
const AI_LEVEL_SELECT = document.getElementById('ai-level');
const BACK_AI_BUTTON = document.getElementById('back-to-title-ai');
const BACK_TWO_PLAYER_BUTTON = document.getElementById('back-to-title-two-player');
const RESULT_MODAL = document.getElementById('result-modal');
const CLOSE_MODAL_BUTTON = document.querySelector('.close-modal');


const manager = new ScreenManager();
let game; 

/**
 * セルがクリックされたときのグローバルハンドラ
 */
function handleCellClick(index) {
    if (!game.isGameActive) return;
    if (game.isAImode && game.currentPlayer === game.AI_PLAYER) return;
    game.makeMove(index);
}

document.addEventListener('DOMContentLoaded', () => {
    // Gameのインスタンス化時に、結果表示用のコールバックとUndoボタンを渡す
    game = new Game(handleCellClick, (winner, finalB, finalW) => {
        document.getElementById('result-message').textContent = winner;
        document.getElementById('final-scores').textContent = `黒 (B): ${finalB} vs 白 (W): ${finalW}`;
        RESULT_MODAL.classList.remove('hidden');
    }, UNDO_BUTTON); // 新機能6: Undoボタンを渡す

    // ===================================================
    // 1. 画面遷移イベント
    // ===================================================
    MODE_AI_BUTTON.addEventListener('click', () => manager.show('settings-ai'));
    MODE_TWO_PLAYER_BUTTON.addEventListener('click', () => manager.show('settings-two-player'));
    BACK_AI_BUTTON.addEventListener('click', () => manager.show('title'));
    BACK_TWO_PLAYER_BUTTON.addEventListener('click', () => manager.show('title'));

    // ===================================================
    // 2. ゲームスタートイベント
    // ===================================================
    START_AI_BUTTON.addEventListener('click', () => {
        const selectedOption = AI_LEVEL_SELECT.options[AI_LEVEL_SELECT.selectedIndex];
        
        game.isAImode = true;
        game.AI_MAX_DEPTH = parseInt(AI_LEVEL_SELECT.value);
        game.AI_LEVEL_LABEL = selectedOption.dataset.label;
        
        const humanPiece = document.querySelector('input[name="player-piece"]:checked').value;
        game.HUMAN_PLAYER = humanPiece;
        game.AI_PLAYER = humanPiece === 'B' ? 'W' : 'B'; 
        
        manager.show('game');
        game.startNewRound(true); 
    });

    START_TWO_PLAYER_BUTTON.addEventListener('click', () => {
        game.isAImode = false;
        game.AI_LEVEL_LABEL = '2人対戦'; 
        
        manager.show('game');
        game.startNewRound(true); 
    });

    // ===================================================
    // 3. ゲーム画面内イベント
    // ===================================================
    RESTART_BUTTON.addEventListener('click', () => {
        game.startNewRound(false); 
    });

    HOME_BUTTON.addEventListener('click', () => {
        manager.show('title');
    });

    // 新機能6: Undoボタンのイベント
    UNDO_BUTTON.addEventListener('click', () => {
        game.undo();
    });

    CLOSE_MODAL_BUTTON.addEventListener('click', () => {
        RESULT_MODAL.classList.add('hidden');
    });
});
