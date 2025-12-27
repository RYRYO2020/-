// AI.js - 鬼レベル限界突破バージョン
const BOARD_SIZE = 8;
const BOARD_CELLS = 64;

const DIRECTIONS = [
    [-1, 0], [1, 0], [0, -1], [0, 1], 
    [-1, -1], [-1, 1], [1, -1], [1, 1]
];

// 盤面の重み（中級・上級用）
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

// --- 基本機能 ---

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

function simulateMove(board, index, player) {
    const nextBoard = [...board];
    const flippable = getFlippableStones(nextBoard, index, player);
    nextBoard[index] = player;
    for (const i of flippable) nextBoard[i] = player;
    return nextBoard;
}

// --- 評価関数 ---
function evaluate(board, aiPlayer, humanPlayer) {
    let score = 0;
    const opponent = humanPlayer;
    
    // 1. 場所の重み
    for (let i = 0; i < 64; i++) {
        if (board[i] === aiPlayer) score += WEIGHTS[i >> 3][i & 7];
        else if (board[i] === opponent) score -= WEIGHTS[i >> 3][i & 7];
    }
    
    // 2. 機動性（相手の手を減らす）
    const aiMoves = getValidMoves(board, aiPlayer).length;
    const humanMoves = getValidMoves(board, opponent).length;
    score += (aiMoves - humanMoves) * 20; 

    return score;
}

// --- ミニマックス法 ---
function minimax(board, depth, alpha, beta, isMaximizing, aiPlayer, humanPlayer) {
    if (depth === 0) return evaluate(board, aiPlayer, humanPlayer);

    const player = isMaximizing ? aiPlayer : humanPlayer;
    let moves = getValidMoves(board, player);

    // パスの場合
    if (moves.length === 0) {
        const opponentMoves = getValidMoves(board, isMaximizing ? humanPlayer : aiPlayer);
        // 双方置けない＝ゲーム終了
        if (opponentMoves.length === 0) {
            const diff = board.filter(c => c === aiPlayer).length - board.filter(c => c === humanPlayer).length;
            return diff * 10000; 
        }
        return minimax(board, depth - 1, alpha, beta, !isMaximizing, aiPlayer, humanPlayer);
    }

    // 探索順序の最適化
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

// --- 初級専用（弱いロジック） ---
function getGreedyMove(board, moves, player) {
    if (Math.random() < 0.3) {
        return moves[Math.floor(Math.random() * moves.length)];
    }
    let bestMove = moves[0];
    let maxFlips = -1;
    moves.sort(() => Math.random() - 0.5);
    for (const move of moves) {
        const flippableCount = getFlippableStones(board, move, player).length;
        if (flippableCount > maxFlips) {
            maxFlips = flippableCount;
            bestMove = move;
        }
    }
    return bestMove;
}

// --- メイン関数 ---
export function findBestMove(board, aiPlayer, humanPlayer, maxDepth) {
    const moves = getValidMoves(board, aiPlayer);
    if (moves.length === 0) return null;

    // === 【初級】 (Level 1) ===
    if (maxDepth === 1) {
        return getGreedyMove(board, moves, aiPlayer);
    }

    // === 【中級】 (Level 3) ===
    if (maxDepth === 3) {
        // 通常の3手読み
        let bestScore = -Infinity;
        let bestMove = moves[0];
        moves.sort(() => Math.random() - 0.5);
        for (const move of moves) {
            if (WEIGHTS[move >> 3][move & 7] === 150) return move;
            const score = minimax(simulateMove(board, move, aiPlayer), 2, -Infinity, Infinity, false, aiPlayer, humanPlayer);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        return bestMove;
    }

    // === 【鬼レベル】 (Level 5以上) ===
    // 限界まで強く
    const emptyCells = board.filter(c => c === null).length;
    let searchDepth = 8; // デフォルトで8手読み（かなり重い・強い）

    // 終盤は完全解析（残り18手以下なら全部読む）
    if (emptyCells <= 18) {
        searchDepth = emptyCells; 
    }

    let bestScore = -Infinity;
    let bestMove = moves[0];

    // 鬼レベルはランダム要素なし。常に最善手を選ぶ。
    // ただし探索順序の最適化のため重み順には並べる
    moves.sort((a, b) => WEIGHTS[b >> 3][b & 7] - WEIGHTS[a >> 3][a & 7]);

    for (const move of moves) {
        // 角は即決（高速化のため）
        if (WEIGHTS[move >> 3][move & 7] === 150) return move;

        const score = minimax(simulateMove(board, move, aiPlayer), searchDepth - 1, -Infinity, Infinity, false, aiPlayer, humanPlayer);
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    return bestMove;
}
