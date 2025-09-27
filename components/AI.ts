
import { BOARD_WIDTH, BOARD_HEIGHT } from '../constants';
import type { Piece, Shape, TetrominoData } from '../types';

interface BestMove {
  rotation: number;
  x: number;
  score: number;
}

const getRotatedShape = (shape: Shape, rotation: number): Shape => {
    let newShape = shape;
    for (let r = 0; r < rotation; r++) {
        newShape = newShape[0].map((_, colIndex) => newShape.map(row => row[colIndex]).reverse());
    }
    return newShape;
};

// Heuristic weights
const WEIGHT_AGGREGATE_HEIGHT = -0.510066;
const WEIGHT_COMPLETED_LINES = 0.760666;
const WEIGHT_HOLES = -0.35663;
const WEIGHT_BUMPINESS = -0.184483;

export const findBestMove = (board: (0 | 1)[][], piece: Piece): BestMove => {
    let bestMove: BestMove = { rotation: 0, x: 0, score: -Infinity };
    let bestBoard = board;

    const { tetromino } = piece;

    for (let rotation = 0; rotation < 4; rotation++) {
        const shape = getRotatedShape(tetromino.shape, rotation);
        const shapeWidth = shape[0].length;
        const shapeHeight = shape.length;
        
        for (let x = -shapeWidth; x < BOARD_WIDTH; x++) {
            // Find drop position
            let y = 0;
            while (isValid(board, shape, x, y + 1)) {
                y++;
            }

            // If move is valid at all
            if (isValid(board, shape, x, y)) {
                const tempBoard = createTempBoard(board, shape, x, y);
                const score = calculateScore(tempBoard);

                if (score > bestMove.score) {
                    bestMove = { rotation, x, score };
                    bestBoard = tempBoard;
                }
            }
        }
    }
    
    return bestMove;
};

const isValid = (board: (0 | 1)[][], shape: Shape, dx: number, dy: number): boolean => {
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const boardX = dx + x;
                const boardY = dy + y;
                if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT || (boardY >= 0 && board[boardY][boardX])) {
                    return false;
                }
            }
        }
    }
    return true;
};

const createTempBoard = (board: (0 | 1)[][], shape: Shape, dx: number, dy: number): (0 | 1)[][] => {
    const newBoard = board.map(row => [...row]);
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const boardX = dx + x;
                const boardY = dy + y;
                if (boardY >= 0) {
                     newBoard[boardY][boardX] = 1;
                }
            }
        }
    }
    return newBoard;
};


const calculateScore = (board: (0 | 1)[][]): number => {
    let aggregateHeight = 0;
    let completedLines = 0;
    let holes = 0;
    let bumpiness = 0;
    const columnHeights: number[] = Array(BOARD_WIDTH).fill(0);

    // Calculate column heights and completed lines
    for (let r = 0; r < BOARD_HEIGHT; r++) {
        let isLineComplete = true;
        for (let c = 0; c < BOARD_WIDTH; c++) {
            if (board[r][c]) {
                if (columnHeights[c] === 0) {
                    columnHeights[c] = BOARD_HEIGHT - r;
                }
            } else {
                isLineComplete = false;
            }
        }
        if (isLineComplete) {
            completedLines++;
        }
    }

    // Calculate aggregate height and bumpiness
    for (let c = 0; c < BOARD_WIDTH; c++) {
        aggregateHeight += columnHeights[c];
        if (c > 0) {
            bumpiness += Math.abs(columnHeights[c] - columnHeights[c - 1]);
        }
    }
    
    // Calculate holes
    for (let c = 0; c < BOARD_WIDTH; c++) {
        for (let r = BOARD_HEIGHT - columnHeights[c] + 1; r < BOARD_HEIGHT; r++) {
            if (board[r][c] === 0) {
                holes++;
            }
        }
    }
    
    return (
        WEIGHT_AGGREGATE_HEIGHT * aggregateHeight +
        WEIGHT_COMPLETED_LINES * completedLines +
        WEIGHT_HOLES * holes +
        WEIGHT_BUMPINESS * bumpiness
    );
};
