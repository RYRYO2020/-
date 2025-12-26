// AI.js - 真・超鬼神モード (Final Kishin + Pass Detection)
const BOARD_SIZE = 8;
const BOARD_CELLS = 64;

const DIRECTIONS = [
    [-1, 0], [1, 0], [0, -1], [0, 1], 
    [-1, -1], [-1, 1], [1, -1], [1, 1]
];

const WEIGHTS = [
    [150, -60, 20, 10, 10, 20, -60, 150],
    [-60, -100, -5, -5, -5, -5, -100, -60],
    [ 20,  -5, 10,  2,  2, 10,  -5,  20],
    [ 10,  -5,  2,  1,  1,  2,  -5,  10],
    [ 10,  -5,  2,  1,  1,  2,  -5,  10],
    [ 20,  -5, 10,  2,  2, 10,  -5,  20],
    [-60, -100, -5, -5, -5, -5, -100, -60],
    [150, -60, 20, 10, 10, 20, -60, 150]
];

// --- 判定ロジック ---

export function getFlippableStones(board, index, player) {
    if (board[index] !== null) return [];
    const y = index >> 3, x = index & 7;
    const opponent = player === 'B' ? 'W' : 'B';
    let flippable = [];
    for (const [dy, dx] of DIRECTIONS) {
        let line = [];
        for (let i = 1; i < 8; i++) {
            const ny = y + dy * i, nx = x + dx * i;
            if (ny < 0 || ny >= 8 || nx < 0 || nx >= 8) { line = []; break; }
            const ni = (ny << 3) + nx;
            const cell = board[ni];
            if (cell === null) { line = []; break; }
            if (cell === opponent) line.push(ni);
            else if (cell === player) { flippable = flippable.concat(line); break; }
        }
    }
    return flippable;
}

export function getValidMoves(board, player) {
    const moves = [];
    for (let i = 0; i < 64; i++) {
        if (board[i] === null && getFlippableStones(board, i, player).length > 0) {
            moves.push(i);
        }
    }
    return moves;
}

export function checkPass(board, player, playerName) {
    const moves = getValidMoves(board, player);
    if (moves.length === 0) {
        console.log(`The player は置く場所がありません。パスします。`);
        return true; 
    }
    return false; 
}

// --- AI思考ロジック ---

function simulateMove(board, index, player) {
    const nextBoard = [...board];
    const flippable = getFlippableStones(nextBoard, index, player);
    nextBoard[index] = player;
    for (const i of flippable) nextBoard[i] = player;
    return nextBoard;
}

function evaluate(board, aiPlayer, humanPlayer) {
    let score = 0;
    const opponent = humanPlayer;
    for (let i = 0; i < 64; i++) {
        if (board[i] === aiPlayer) score += WEIGHTS[i >> 3][i & 7];
        else if (board[i] === opponent) score -= WEIGHTS[i >> 3][i & 7];
    }
    const aiMoves = getValidMoves(board, aiPlayer).length;
    const humanMoves = getValidMoves(board, opponent).length;
    score += (aiMoves - humanMoves) * 30; // 機動性重視
    return score;
}

function minimax(board, depth, alpha, beta, isMaximizing, aiPlayer, humanPlayer) {
    if (depth === 0) return evaluate(board, aiPlayer, humanPlayer);

    const player = isMaximizing ? aiPlayer : humanPlayer;
    let moves = getValidMoves(board, player);

    if (moves.length === 0) {
        const opponentMoves = getValidMoves(board, isMaximizing ? humanPlayer : aiPlayer);
        if (opponentMoves.length === 0) {
            const diff = board.filter(c => c === aiPlayer).length - board.filter(c => c === humanPlayer).length;
            return diff * 10000;
        }
        return minimax(board, depth - 1, alpha, beta, !isMaximizing, aiPlayer, humanPlayer);
    }

    moves.sort((a, b) => WEIGHTS[b >> 3][b & 7] - WEIGHTS[a >> 3][a & 7]);

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const ev = minimax(simulateMove(board, move, aiPlayer), depth - 1, alpha, beta, false, aiPlayer, humanPlayer);
            maxEval = Math.max(maxEval, ev);
            alpha = Math.max(alpha, ev);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            const ev = minimax(simulateMove(board, move, humanPlayer), depth - 1, alpha, beta, true, aiPlayer, humanPlayer);
            minEval = Math.min(minEval, ev);
            beta = Math.min(beta, ev);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

export function findBestMove(board, aiPlayer, humanPlayer, maxDepth) {
    const moves = getValidMoves(board, aiPlayer);
    
    // AIに置く場所がない場合
    if (moves.length === 0) {
        alert("AIは置く場所がありません。パスします。");
        return null;
    }

    const emptyCells = board.filter(c => c === null).length;
    let searchDepth = maxDepth;
    if (emptyCells <= 12) searchDepth = 12;
    else if (emptyCells <= 18) searchDepth = 8;
    else searchDepth = 6;

    let bestScore = -Infinity;
    let bestMove = moves[0];

    for (const move of moves) {
        if (WEIGHTS[move >> 3][move & 7] === 150) return move; // 角は即決
        const score = minimax(simulateMove(board, move, aiPlayer), searchDepth - 1, -Infinity, Infinity, false, aiPlayer, humanPlayer);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    return bestMove;
}