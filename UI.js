// UI.js
const BOARD_ELEMENT = document.getElementById('board');
const INFO = document.getElementById('game-info');
const SCORE_X = document.getElementById('score-x'); 
const SCORE_O = document.getElementById('score-o'); 
const SCORE_DRAW = document.getElementById('score-draw');
const PLAYER_X_LABEL = document.getElementById('player-x-label'); 
const PLAYER_O_LABEL = document.getElementById('player-o-label'); 
const MOVE_LOG = document.getElementById('move-log'); 
const CURRENT_SETTING = document.getElementById('current-setting');
const COORDS_TOP = document.getElementById('coords-top'); 
const COORDS_LEFT = document.getElementById('coords-left'); 
const AI_THINKING_INDICATOR = document.getElementById('ai-thinking-indicator'); 

/**
 * 盤面をHTMLに初期描画し、座標を表示する (8x8に対応)
 */
export function createBoard(cellClickHandler, boardSize) {
    BOARD_ELEMENT.innerHTML = '';
    COORDS_TOP.innerHTML = '';
    COORDS_LEFT.innerHTML = '';

    // 盤面グリッド設定
    BOARD_ELEMENT.style.gridTemplateColumns = `repeat(${boardSize}, 1fr)`;
    BOARD_ELEMENT.style.gridTemplateRows = `repeat(${boardSize}, 1fr)`;
    
    // 座標の表示
    for (let i = 0; i < boardSize; i++) {
        // A, B, C...
        const colLabel = document.createElement('span');
        colLabel.classList.add('coord-label');
        colLabel.textContent = String.fromCharCode(65 + i); 
        COORDS_TOP.appendChild(colLabel);

        // 1, 2, 3...
        const rowLabel = document.createElement('span');
        rowLabel.classList.add('coord-label');
        rowLabel.textContent = i + 1;
        COORDS_LEFT.appendChild(rowLabel);
    }

    // セルの生成
    for (let i = 0; i < boardSize * boardSize; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.index = i;
        cell.addEventListener('click', () => cellClickHandler(i));
        
        const stone = document.createElement('div');
        stone.classList.add('stone');
        cell.appendChild(stone);

        BOARD_ELEMENT.appendChild(cell);
    }
}

export function updateInfo(message) { INFO.textContent = message; }

export function renderMove(index, player) {
    const cell = BOARD_ELEMENT.querySelector(`[data-index="${index}"]`);
    if (cell) {
        cell.classList.remove('player-B', 'player-W', 'hint');
        cell.classList.add(`player-${player}`);
        cell.querySelector('.stone').classList.remove('flipping');
    }
}

export function renderFlip(index, newPlayer) {
    const cell = BOARD_ELEMENT.querySelector(`[data-index="${index}"]`);
    const stone = cell.querySelector('.stone');
    
    cell.classList.remove('player-B', 'player-W');
    
    stone.classList.add('flipping');
    stone.addEventListener('animationend', () => {
        stone.classList.remove('flipping');
        cell.classList.add(`player-${newPlayer}`);
    }, { once: true });
}

export function updateScoreboard(score, isAImode, humanPlayer, finalCounts, levelLabel) {
    SCORE_X.textContent = finalCounts ? finalCounts.finalB : score.B; 
    SCORE_O.textContent = finalCounts ? finalCounts.finalW : score.W; 
    SCORE_DRAW.textContent = score.Draw;

    if (isAImode) {
        PLAYER_X_LABEL.textContent = humanPlayer === 'B' ? 'あなた' : 'AI';
        PLAYER_O_LABEL.textContent = humanPlayer === 'W' ? 'あなた' : 'AI';
    } else {
        PLAYER_X_LABEL.textContent = 'P1';
        PLAYER_O_LABEL.textContent = 'P2';
    }
    
    CURRENT_SETTING.textContent = isAImode ? `モード: AI対戦 (${levelLabel})` : 'モード: 2人対戦';
}

export function updateLiveScore(counts) {
    SCORE_X.textContent = counts.B; 
    SCORE_O.textContent = counts.W; 
}


export function updateHints(validMoves) {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('hint');
    });

    validMoves.forEach(index => {
        const cell = BOARD_ELEMENT.querySelector(`[data-index="${index}"]`);
        if (cell) {
            cell.classList.add('hint');
        }
    });
}

export function updateLog(player, coord) {
    if (player === null) {
        MOVE_LOG.textContent = 'ゲーム開始';
        return;
    }
    const color = player === 'B' ? '黒' : '白';
    const cellName = `(${String.fromCharCode(65 + coord.x)}, ${coord.y + 1})`; 
    MOVE_LOG.textContent = `直前の手: ${color} が ${cellName} に置きました。`;
}

export function showThinkingIndicator() {
    AI_THINKING_INDICATOR.classList.remove('hidden');
}

export function hideThinkingIndicator() {
    AI_THINKING_INDICATOR.classList.add('hidden');
}

export function highlightCell(index, duration) {
    const cell = BOARD_ELEMENT.querySelector(`[data-index="${index}"]`);
    if (cell) {
        cell.classList.add('highlighted');
        setTimeout(() => {
            cell.classList.remove('highlighted');
        }, duration);
    }
}

export function showInvalidMoveError(index) {
    const cell = BOARD_ELEMENT.querySelector(`[data-index="${index}"]`);
    if (cell) {
        cell.classList.add('invalid-move');
        setTimeout(() => {
            cell.classList.remove('invalid-move');
        }, 300);
    }
}

export function toggleFinalCountdown(isOn) {
    if (isOn) {
        BOARD_ELEMENT.classList.add('final-countdown');
    } else {
        BOARD_ELEMENT.classList.remove('final-countdown');
    }
}

export function animateTurnChange(player) {
    const scoreElement = player === 'B' ? document.getElementById('score-x') : document.getElementById('score-o');
    const labelElement = player === 'B' ? PLAYER_X_LABEL : PLAYER_O_LABEL;

    [scoreElement, labelElement].forEach(el => {
        el.classList.remove('current-turn-animate');
        void el.offsetWidth; 
        el.classList.add('current-turn-animate');
    });
}