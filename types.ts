
export type Shape = (0 | 1)[][];

export interface Tetromino {
  shape: Shape;
  color: string;
}

export interface Piece {
  x: number;
  y: number;
  tetromino: Tetromino;
  rotation: number;
}

export interface TetrominoData {
  shape: Shape;
  color: string;
}

export type PlayerType = 'human' | 'ai';
