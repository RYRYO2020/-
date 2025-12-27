// AI.js - レベル修正版
const BOARD_SIZE = 8;
const BOARD_CELLS = 64;

const DIRECTIONS = [
    [-1, 0], [1, 0], [0, -1], [0, 1], 
    [-1, -1], [-1, 1], [1, -1], [1, 1]
];

// 盤面の重みづけ（角や端を重視）
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
    // 確定石や着手可能数も考慮するとより強くなるが、今回はシンプルに重みメイン
    const aiMoves = getValidMoves(board, aiPlayer).length;
    const humanMoves = getValidMoves(board, opponent).length;
    score += (aiMoves - humanMoves) * 20; 
    return score;
}

function minimax(board, depth, alpha, beta, isMaximizing, aiPlayer, humanPlayer) {
    if (depth === 0) return evaluate(board, aiPlayer, humanPlayer);

    const player = isMaximizing ? aiPlayer : humanPlayer;
    let moves = getValidMoves(board, player);

    // パスの場合
    if (moves.length === 0) {
        const opponentMoves = getValidMoves(board, isMaximizing ? humanPlayer : aiPlayer);
        // 双方が置けない＝ゲーム終了
        if (opponentMoves.length === 0) {
            const diff = board.filter(c => c === aiPlayer).length - board.filter(c => c === humanPlayer).length;
            return diff * 10000; // 石数差で勝敗判定
        }
        // パスして探索継続
        return minimax(board, depth - 1, alpha, beta, !isMaximizing, aiPlayer, humanPlayer);
    }

    // 探索順序の最適化（良い手から探索すると高速化）
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
        // パス処理はGame.js側で行うため、ここではnullを返すだけにする
        return null;
    }

    // ★修正箇所: レベルに応じた深さ制御
    let searchDepth = maxDepth;

    // 「上級」以上（maxDepthが5以上）に設定されている場合のみ、状況に応じてブーストする
    if (maxDepth >= 5) {
        const emptyCells = board.filter(c => c === null).length;
        if (emptyCells <= 14) searchDepth = 14; // 終盤：完全読み（最強）
        else if (emptyCells <= 20) searchDepth = 8; // 終盤手前：深く読む
        else searchDepth = 6; // 序盤中盤：そこそこ深く
    }
    // ※ 初級(1)や中級(3)の場合は、渡された maxDepth をそのまま使うので弱くなる

    let bestScore = -Infinity;
    let bestMove = moves[0];

    // ランダム性を少し入れる（同じ局面で毎回全く同じ手を打つのを防ぐため）
    // 配列をシャッフルしてから探索開始
    moves.sort(() => Math.random() - 0.5);

    for (const move of moves) {
        // 角（重み150）が取れるなら最優先で取る（高速化）
        if (WEIGHTS[move >> 3][move & 7] === 150) return move;

        const score = minimax(simulateMove(board, move, aiPlayer), searchDepth - 1, -Infinity, Infinity, false, aiPlayer, humanPlayer);
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    return bestMove;
}
