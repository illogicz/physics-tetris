
import type { TetrominoData } from './types';

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const BLOCK_SIZE = 30; // pixels

export const TETROMINOS: { [key: string]: TetrominoData } = {
  I: {
    shape: [[1, 1, 1, 1]],
    color: 'bg-cyan-500 border-cyan-300',
  },
  O: {
    shape: [[1, 1], [1, 1]],
    color: 'bg-yellow-500 border-yellow-300',
  },
  T: {
    shape: [[0, 1, 0], [1, 1, 1]],
    color: 'bg-purple-500 border-purple-300',
  },
  L: {
    shape: [[0, 0, 1], [1, 1, 1]],
    color: 'bg-orange-500 border-orange-300',
  },
  J: {
    shape: [[1, 0, 0], [1, 1, 1]],
    color: 'bg-blue-500 border-blue-300',
  },
  S: {
    shape: [[0, 1, 1], [1, 1, 0]],
    color: 'bg-green-500 border-green-300',
  },
  Z: {
    shape: [[1, 1, 0], [0, 1, 1]],
    color: 'bg-red-500 border-red-300',
  },
};

export const TETROMINO_KEYS = Object.keys(TETROMINOS);
