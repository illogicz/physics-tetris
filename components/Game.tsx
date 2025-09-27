
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TETROMINOS, TETROMINO_KEYS } from '../constants';
import type { TetrominoData, Piece } from '../types';
import { useGameInstance } from '../hooks/useGameInstance';

const getRandomTetromino = (): TetrominoData => {
    const key = TETROMINO_KEYS[Math.floor(Math.random() * TETROMINO_KEYS.length)];
    return TETROMINOS[key];
};

const generatePieceQueue = (length: number): TetrominoData[] => {
    return Array.from({ length }, getRandomTetromino);
};

const Controls = () => (
    <div className="mt-4 p-4 bg-slate-800 rounded-lg text-sm text-slate-300 w-full">
        <h3 className="font-bold text-lg mb-2 text-cyan-400">Controls</h3>
        <ul className="list-disc list-inside space-y-1">
            <li><span className="font-bold">Left/Right Arrows:</span> Move piece</li>
            <li><span className="font-bold">Up Arrow:</span> Rotate piece</li>
            <li><span className="font-bold">Down Arrow:</span> Soft drop</li>
        </ul>
    </div>
);

const Game: React.FC = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [winner, setWinner] = useState<'human' | 'ai' | null>(null);
    const [pieceQueue, setPieceQueue] = useState<TetrominoData[]>([]);

    const handleGameOver = useCallback((loser: 'human' | 'ai') => {
        setIsPlaying(false);
        setWinner(loser === 'human' ? 'ai' : 'human');
    }, []);

    const player = useGameInstance({ 
        playerType: 'human',
        onGameOver: () => handleGameOver('human'),
        isPlaying
    });

    const ai = useGameInstance({
        playerType: 'ai',
        onGameOver: () => handleGameOver('ai'),
        isPlaying
    });

    const startGame = () => {
        const newQueue = generatePieceQueue(200);
        setPieceQueue(newQueue);
        setWinner(null);
        player.startGame(newQueue);
        ai.startGame(newQueue);
        setIsPlaying(true);
    };

    // Keyboard controls for the human player
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isPlaying) {
                player.handleKeyDown(e);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, player.handleKeyDown]);

    const GameBoard = ({ instance, title }: { instance: ReturnType<typeof useGameInstance>, title: string }) => (
        <div className="flex flex-col items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-300">{title}</h2>
            <div
                ref={instance.gameContainerRef}
                className="relative bg-slate-950 border-2 border-slate-700 shadow-lg shadow-cyan-500/10"
                style={{ width: instance.GAME_WIDTH, height: instance.GAME_HEIGHT }}
            >
                <canvas ref={instance.canvasRef} />
                {isPlaying && instance.renderFallingPiece()}
            </div>
        </div>
    );
    
    const ScoreDisplay = ({ p1Score, p2Score }: { p1Score: number, p2Score: number }) => (
        <div className="p-4 bg-slate-800 rounded-lg text-center">
            <h3 className="font-bold text-lg text-cyan-400">Score</h3>
            <div className="flex justify-around mt-2">
                <div>
                    <p className="text-sm">Player</p>
                    <p className="text-2xl font-bold">{p1Score}</p>
                </div>
                <div>
                    <p className="text-sm">AI</p>
                    <p className="text-2xl font-bold">{p2Score}</p>
                </div>
            </div>
        </div>
    );

    const NextPieceDisplay = ({ piece }: { piece: Piece | null }) => {
        if (!piece) return null;
        const { shape, color } = piece.tetromino;
        const displayGrid = Array(4).fill(0).map(() => Array(4).fill(0));

        shape.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell) {
                    displayGrid[y][x] = 1;
                }
            });
        });

        return (
            <div className="p-4 bg-slate-800 rounded-lg">
                <h3 className="font-bold text-lg mb-2 text-cyan-400 text-center">Next</h3>
                <div className="grid grid-cols-4 gap-px mx-auto w-min">
                    {displayGrid.map((row, y) =>
                        row.map((cell, x) => (
                            <div
                                key={`${y}-${x}`}
                                className={`w-5 h-5 ${cell ? `${color} border-t-2 border-l-2` : 'bg-slate-900/50'}`}
                            />
                        ))
                    )}
                </div>
            </div>
        );
    };


    return (
        <div className="flex flex-col lg:flex-row gap-4 items-start relative">
             {!isPlaying && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 text-center p-4 rounded-lg">
                    {winner === 'human' && (
                         <>
                            <h2 className="text-4xl font-bold text-green-500">You Win!</h2>
                            <p className="text-xl mt-2">You defeated the AI!</p>
                         </>
                    )}
                    {winner === 'ai' && (
                         <>
                            <h2 className="text-4xl font-bold text-red-500">Game Over</h2>
                            <p className="text-xl mt-2">The AI has won.</p>
                         </>
                    )}
                    {!winner && <h2 className="text-4xl font-bold text-cyan-400">Ready?</h2>}
                    
                    <button
                        onClick={startGame}
                        className="mt-6 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105"
                    >
                        {winner ? 'Play Again' : 'Start Game'}
                    </button>
                </div>
            )}
            <GameBoard instance={player} title="Player" />
            
            <div className="flex flex-col gap-4 w-full lg:w-48 order-first lg:order-none">
                <ScoreDisplay p1Score={player.score} p2Score={ai.score} />
                <NextPieceDisplay piece={player.nextPiece} />
                <Controls />
            </div>

            <GameBoard instance={ai} title="AI" />
        </div>
    );
};

export default Game;