import { describe, test } from 'vitest';

import type { Game } from '../src/Game';
import { countNeighbours, expandPop } from '../src/board';

interface Level {
    name: string;
    width: number;
    height: number;
    mines: number;
}

const LEVELS: Level[] = [
    { name: 'beginner', width: 9, height: 9, mines: 10 },
    { name: 'intermediate', width: 16, height: 16, mines: 40 },
    { name: 'expert', width: 30, height: 16, mines: 99 },
    { name: 'large', width: 100, height: 100, mines: 1000 },
];

// Deterministic PRNG (mulberry32) so every run benchmarks the same boards.
function createRandom(seed: number): () => number {
    let state = seed >>> 0;
    return (): number => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function createPopped(width: number, height: number): boolean[][] {
    return Array.from({ length: height }, () => Array.from({ length: width }, () => false));
}

function createGame(level: Level, board: number[][]): Game {
    return {
        level: level.name,
        mines: level.mines,
        board,
        popped: createPopped(level.width, level.height),
        boardWidth: level.width,
        boardHeight: level.height,
        player1: 'player1',
        p1score: 0,
        p1key: 'key1',
        player2: 'player2',
        p2key: 'key2',
        p2score: 0,
        turn: 'player1',
    };
}

// Mirrors the board generation done in app.ts when a game starts.
function generateBoard(level: Level, seed: number): Game {
    const random = createRandom(seed);
    const board = Array.from({ length: level.height }, () => Array.from({ length: level.width }, () => 0));
    const game = createGame(level, board);
    let minesLeft = level.mines;
    while (minesLeft > 0) {
        const x = Math.floor(random() * level.width);
        const y = Math.floor(random() * level.height);
        if (board[y][x] !== -1) {
            board[y][x] = -1;
            minesLeft--;
        }
    }
    for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
            if (board[y][x] !== -1) {
                board[y][x] = countNeighbours(game, x, y);
            }
        }
    }
    return game;
}

function createEmptyBoard(level: Level): Game {
    const board = Array.from({ length: level.height }, () => Array.from({ length: level.width }, () => 0));
    return createGame(level, board);
}

// Finds the empty cell whose flood fill reveals the most cells.
function findLargestOpening(game: Game): [number, number] {
    let best: [number, number] = [0, 0];
    let bestSize = -1;
    for (let y = 0; y < game.boardHeight; y++) {
        for (let x = 0; x < game.boardWidth; x++) {
            if (game.board[y][x] === 0) {
                game.popped = createPopped(game.boardWidth, game.boardHeight);
                const size = expandPop(x, y, game).length;
                if (size > bestSize) {
                    bestSize = size;
                    best = [x, y];
                }
            }
        }
    }
    game.popped = createPopped(game.boardWidth, game.boardHeight);
    return best;
}

describe('generate board', () => {
    for (const level of LEVELS) {
        test(level.name, async ({ bench }) => {
            await bench(level.name, () => {
                generateBoard(level, 42);
            }).run();
        });
    }
});

describe('countNeighbours', () => {
    for (const level of LEVELS) {
        test(`${level.name} - every cell`, async ({ bench }) => {
            const game = generateBoard(level, 42);
            await bench(`${level.name} - every cell`, () => {
                let total = 0;
                for (let y = 0; y < game.boardHeight; y++) {
                    for (let x = 0; x < game.boardWidth; x++) {
                        total += countNeighbours(game, x, y);
                    }
                }
                return total;
            }).run();
        });
    }
});

describe('expandPop', () => {
    for (const level of LEVELS) {
        test(`${level.name} - largest opening`, async ({ bench }) => {
            const game = generateBoard(level, 42);
            const [x, y] = findLargestOpening(game);
            await bench(
                `${level.name} - largest opening`,
                {
                    beforeEach: (): void => {
                        game.popped = createPopped(game.boardWidth, game.boardHeight);
                    },
                },
                () => {
                    expandPop(x, y, game);
                },
            ).run();
        });
    }

    // The large board is skipped here: flooding it entirely recurses too deep.
    for (const level of LEVELS.filter((l) => l.name !== 'large')) {
        test(`${level.name} - empty board`, async ({ bench }) => {
            const game = createEmptyBoard(level);
            await bench(
                `${level.name} - empty board`,
                {
                    beforeEach: (): void => {
                        game.popped = createPopped(game.boardWidth, game.boardHeight);
                    },
                },
                () => {
                    expandPop(0, 0, game);
                },
            ).run();
        });
    }
});
