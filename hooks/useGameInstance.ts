import React, { useState, useEffect, useRef, useCallback } from 'react';
import Matter from 'matter-js';
import { BOARD_WIDTH, BOARD_HEIGHT, BLOCK_SIZE } from '../constants';
import type { Piece, Shape, TetrominoData, PlayerType } from '../types';
import { findBestMove } from '../components/AI';

const getRotatedShape = (piece: Piece): Shape => {
    let shape = piece.tetromino.shape;
    for (let r = 0; r < piece.rotation; r++) {
        shape = shape[0].map((_, colIndex) => shape.map(row => row[colIndex]).reverse());
    }
    return shape;
};


interface UseGameInstanceProps {
    playerType: PlayerType;
    onGameOver: () => void;
    isPlaying: boolean;
}

export const useGameInstance = ({ playerType, onGameOver, isPlaying }: UseGameInstanceProps) => {
    const [score, setScore] = useState(0);
    const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
    const [nextPiece, setNextPiece] = useState<Piece | null>(null);
    const [pieceQueue, setPieceQueue] = useState<TetrominoData[]>([]);
    const [pieceIndex, setPieceIndex] = useState(0);
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameContainerRef = useRef<HTMLDivElement>(null);

    const engineRef = useRef<Matter.Engine | null>(null);
    const runnerRef = useRef<Matter.Runner | null>(null);
    const renderRef = useRef<Matter.Render | null>(null);
    const allBodiesRef = useRef<Matter.Body[]>([]);
    const aiProcessedIndexRef = useRef<number | null>(null);

    const GAME_WIDTH = BOARD_WIDTH * BLOCK_SIZE;
    const GAME_HEIGHT = BOARD_HEIGHT * BLOCK_SIZE;

    // Add cleanup effect for when the component unmounts
    useEffect(() => {
        return () => {
            if (renderRef.current) {
                Matter.Render.stop(renderRef.current);
            }
            if (runnerRef.current) {
                Matter.Runner.stop(runnerRef.current);
            }
            if (engineRef.current) {
                Matter.World.clear(engineRef.current.world, true);
                Matter.Engine.clear(engineRef.current);
            }
        };
    }, []);


    const createPiece = useCallback((index: number): Piece | null => {
        if (!pieceQueue[index]) return null;
        const tetromino = pieceQueue[index];
        const nextTetromino = pieceQueue[index + 1];

        if (nextTetromino) {
            setNextPiece({ tetromino: nextTetromino, x: 0, y: 0, rotation: 0});
        } else {
            setNextPiece(null);
        }

        return {
            tetromino,
            x: Math.floor(BOARD_WIDTH / 2) - 1,
            y: 0,
            rotation: 0,
        };
    }, [pieceQueue]);

    const isValidMove = useCallback((piece: Piece, offsetX: number, offsetY: number, newRotation?: number): boolean => {
        const testPiece = {
            ...piece,
            x: piece.x + offsetX,
            y: piece.y + offsetY,
            rotation: newRotation !== undefined ? newRotation : piece.rotation
        };
        const shape = getRotatedShape(testPiece);

        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const boardX = testPiece.x + x;
                    const boardY = testPiece.y + y;

                    if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
                        return false;
                    }
                    
                    const worldX = (boardX + 0.5) * BLOCK_SIZE;
                    const worldY = (boardY + 0.5) * BLOCK_SIZE;

                    if (Matter.Query.point(allBodiesRef.current, { x: worldX, y: worldY }).length > 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }, []);

    const lockPiece = useCallback((pieceToLock: Piece) => {
        if (!engineRef.current) return; // Guard against uninitialized engine

        const shape = getRotatedShape(pieceToLock);
        const { x: pieceX, y: pieceY, tetromino } = pieceToLock;
        
        const colorClass = tetromino.color.split(' ')[0];
        const colorMap: { [key: string]: string } = {
            'bg-cyan-500': '#06b6d4', 'bg-yellow-500': '#eab308', 'bg-purple-500': '#8b5cf6',
            'bg-orange-500': '#f97316', 'bg-blue-500': '#3b82f6', 'bg-green-500': '#22c55e',
            'bg-red-500': '#ef4444',
        };
        const fillColor = colorMap[colorClass] || '#7f8c8d';

        const bodyParts: Matter.Body[] = [];
        shape.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell) {
                    const block = Matter.Bodies.rectangle(
                        (pieceX + c + 0.5) * BLOCK_SIZE,
                        (pieceY + r + 0.5) * BLOCK_SIZE,
                        BLOCK_SIZE,
                        BLOCK_SIZE
                    );
                    bodyParts.push(block);
                }
            });
        });

        if (bodyParts.length === 0) {
            setPieceIndex(prevIndex => {
                const nextIdx = prevIndex + 1;
                setCurrentPiece(createPiece(nextIdx));
                return nextIdx;
            });
            return;
        }

        const compoundBody = Matter.Body.create({
            parts: bodyParts,
            restitution: 0,
            friction: 1,
            frictionStatic: 10,
            frictionAir: 0.1,
            density: 0.01,
        });

        compoundBody.parts.forEach((part, i) => {
            if (i === 0) return;
            part.render.fillStyle = fillColor;
            part.render.strokeStyle = '#ecf0f1';
            part.render.lineWidth = 2;
        });
        
        Matter.World.add(engineRef.current.world, compoundBody);
        allBodiesRef.current.push(compoundBody);

        const blockCount = shape.flat().filter(cell => cell === 1).length;
        setScore(prev => prev + 10 * blockCount);

        setPieceIndex(prevIndex => {
            const nextIdx = prevIndex + 1;
            const newPiece = createPiece(nextIdx);
            if (!newPiece || !isValidMove(newPiece, 0, 0)) {
                onGameOver();
                setCurrentPiece(newPiece);
            } else {
                setCurrentPiece(newPiece);
            }
            return nextIdx;
        });
    }, [createPiece, isValidMove, onGameOver]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!currentPiece || playerType !== 'human') return;

        switch (e.key) {
            case 'ArrowLeft':
                if (isValidMove(currentPiece, -1, 0)) setCurrentPiece(p => p && { ...p, x: p.x - 1 });
                break;
            case 'ArrowRight':
                if (isValidMove(currentPiece, 1, 0)) setCurrentPiece(p => p && { ...p, x: p.x + 1 });
                break;
            case 'ArrowDown':
                if (isValidMove(currentPiece, 0, 1)) {
                    setCurrentPiece(p => p && { ...p, y: p.y + 1 });
                } else {
                    lockPiece(currentPiece);
                }
                break;
            case 'ArrowUp':
                const newRotation = (currentPiece.rotation + 1) % 4;
                if (isValidMove(currentPiece, 0, 0, newRotation)) setCurrentPiece(p => p && { ...p, rotation: newRotation });
                break;
        }
    }, [currentPiece, isValidMove, lockPiece, playerType]);
    
    const gameTickCallback = useRef<(() => void) | null>(null);

    useEffect(() => {
        gameTickCallback.current = () => {
            if (!currentPiece || !isPlaying) return;
            if (isValidMove(currentPiece, 0, 1)) {
                setCurrentPiece(p => p && ({ ...p, y: p.y + 1 }));
            } else {
                lockPiece(currentPiece);
            }
        };
    }, [currentPiece, isValidMove, lockPiece, isPlaying]);
    
    useEffect(() => {
        if (!isPlaying || playerType !== 'human') return;
        
        const gameTick = setInterval(() => {
            gameTickCallback.current?.();
        }, 1000);

        return () => clearInterval(gameTick);
    }, [isPlaying, playerType]);

    useEffect(() => {
        if (playerType !== 'ai' || !currentPiece || !isPlaying) return;
        
        const processingId = pieceIndex;
        aiProcessedIndexRef.current = processingId;
        const pieceToProcess = { ...currentPiece };

        const staticBoard = Array(BOARD_HEIGHT).fill(0).map(() => Array(BOARD_WIDTH).fill(0));
        allBodiesRef.current.forEach(body => {
            if (body.isStatic) return;
            body.parts.forEach((part, i) => {
                if (i === 0) return;
                const { min, max } = part.bounds;
                const startX = Math.max(0, Math.floor(min.x / BLOCK_SIZE));
                const endX = Math.min(BOARD_WIDTH, Math.ceil(max.x / BLOCK_SIZE));
                const startY = Math.max(0, Math.floor(min.y / BLOCK_SIZE));
                const endY = Math.min(BOARD_HEIGHT, Math.ceil(max.y / BLOCK_SIZE));

                for (let y = startY; y < endY; y++) {
                    for (let x = startX; x < endX; x++) {
                        const cellCenterX = (x + 0.5) * BLOCK_SIZE;
                        const cellCenterY = (y + 0.5) * BLOCK_SIZE;
                        if (Matter.Query.point([part], { x: cellCenterX, y: cellCenterY }).length > 0) {
                             staticBoard[y][x] = 1;
                        }
                    }
                }
            });
        });
        
        const thinkDelay = 400;
        const timerId = setTimeout(() => {
            if (!isPlaying || aiProcessedIndexRef.current !== processingId) {
                return;
            }

            const bestMove = findBestMove(staticBoard, pieceToProcess);
            let finalPiece = { ...pieceToProcess, rotation: bestMove.rotation, x: bestMove.x };
            
            while(isValidMove(finalPiece, 0, 1)) {
                finalPiece.y++;
            }
            
            lockPiece(finalPiece);
        }, thinkDelay);

        return () => {
            clearTimeout(timerId);
        };

    }, [currentPiece, pieceIndex, playerType, isPlaying, lockPiece, isValidMove]);

    const startGame = (queue: TetrominoData[]) => {
        if (!canvasRef.current || !gameContainerRef.current) return;
    
        let engine = engineRef.current;
    
        // Initialize engine, runner, and renderer on first start only
        if (!engine) {
            engine = Matter.Engine.create({});
            engineRef.current = engine;
    
            engine.gravity.y = 1;
            engine.positionIterations = 12;
    
            const render = Matter.Render.create({
                element: gameContainerRef.current,
                engine: engine,
                canvas: canvasRef.current,
                options: {
                    width: GAME_WIDTH,
                    height: GAME_HEIGHT,
                    wireframes: false,
                    background: 'transparent'
                }
            });
            renderRef.current = render;
    
            const runner = Matter.Runner.create();
            runnerRef.current = runner;
    
            Matter.Render.run(render);
            Matter.Runner.run(runner, engine);
    
            // Add boundary walls only once
            const ground = Matter.Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT + 25, GAME_WIDTH, 50, { isStatic: true, friction: 10 });
            const leftWall = Matter.Bodies.rectangle(-25, GAME_HEIGHT / 2, 50, GAME_HEIGHT, { isStatic: true });
            const rightWall = Matter.Bodies.rectangle(GAME_WIDTH + 25, GAME_HEIGHT / 2, 50, GAME_HEIGHT, { isStatic: true });
    
            Matter.World.add(engine.world, [ground, leftWall, rightWall]);
        }
    
        // --- Game Reset Logic ---
        // Clear all piece bodies from the previous game
        if (allBodiesRef.current.length > 0) {
            Matter.World.remove(engine.world, allBodiesRef.current);
        }
        allBodiesRef.current = [];
        aiProcessedIndexRef.current = null;
    
        // --- React State Reset Logic ---
        setScore(0);
        setPieceQueue(queue);
        setPieceIndex(0);
    
        if (queue.length > 0) {
            const currentTetromino = queue[0];
            const nextTetromino = queue[1];
    
            if (nextTetromino) {
                setNextPiece({ tetromino: nextTetromino, x: 0, y: 0, rotation: 0 });
            } else {
                setNextPiece(null);
            }
    
            setCurrentPiece({
                tetromino: currentTetromino,
                x: Math.floor(BOARD_WIDTH / 2) - 1,
                y: 0,
                rotation: 0,
            });
        } else {
            setCurrentPiece(null);
            setNextPiece(null);
        }
    };
    

    const renderFallingPiece = () => {
        if (!currentPiece) return null;
        const shape = getRotatedShape(currentPiece);
        const { tetromino, x, y } = currentPiece;

        return shape.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
                if (cell) {
                    return React.createElement('div', {
                        key: `${rowIndex}-${colIndex}`,
                        className: `absolute ${tetromino.color} border-t-2 border-l-2`,
                        style: {
                            width: BLOCK_SIZE,
                            height: BLOCK_SIZE,
                            left: (x + colIndex) * BLOCK_SIZE,
                            top: (y + rowIndex) * BLOCK_SIZE,
                            transition: 'top 0.05s linear, left 0.05s linear',
                        },
                    });
                }
                return null;
            }),
        );
    };

    return {
        score,
        currentPiece,
        nextPiece,
        canvasRef,
        gameContainerRef,
        startGame,
        handleKeyDown,
        renderFallingPiece,
        GAME_WIDTH,
        GAME_HEIGHT,
    };
};
