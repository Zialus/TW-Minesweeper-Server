import { bench, describe } from 'vitest';
import {
    countNeighbours,
    expandPop,
    initializeBoard,
    getOpponent,
    positionWithinTable,
    checkPair,
    keyFoundOnActiveGame,
    findOpponent,
    createHash,
} from '../src/game-logic';
import { Game } from '../src/Game';
import { Player } from '../src/Player';

function createTestGame(level: string): Game {
    return initializeBoard(level);
}

function createPreparedGame(level: string): Game {
    const game = createTestGame(level);
    game.player1 = 'alice';
    game.p1key = 'key1';
    game.player2 = 'bob';
    game.p2key = 'key2';
    game.turn = 'alice';
    return game;
}

describe('board initialization', () => {
    bench('initializeBoard - beginner (9x9, 10 mines)', () => {
        initializeBoard('beginner');
    });

    bench('initializeBoard - intermediate (16x16, 40 mines)', () => {
        initializeBoard('intermediate');
    });

    bench('initializeBoard - expert (30x16, 99 mines)', () => {
        initializeBoard('expert');
    });
});

describe('countNeighbours', () => {
    const beginnerGame = createTestGame('beginner');
    const expertGame = createTestGame('expert');

    bench('countNeighbours - beginner board center', () => {
        countNeighbours(beginnerGame, 4, 4);
    });

    bench('countNeighbours - beginner board corner', () => {
        countNeighbours(beginnerGame, 0, 0);
    });

    bench('countNeighbours - expert board center', () => {
        countNeighbours(expertGame, 15, 8);
    });
});

describe('expandPop', () => {
    bench('expandPop - beginner board', () => {
        const game = createTestGame('beginner');
        // Find a non-mine cell to pop
        let x = 0;
        let y = 0;
        for (let i = 0; i < game.boardHeight; i++) {
            for (let j = 0; j < game.boardWidth; j++) {
                if (game.board[i][j] !== -1) {
                    x = j;
                    y = i;
                    i = game.boardHeight; // break outer loop
                    break;
                }
            }
        }
        const moveMatrix: number[][] = [];
        expandPop(x, y, game, moveMatrix);
    });

    bench('expandPop - expert board', () => {
        const game = createTestGame('expert');
        let x = 0;
        let y = 0;
        for (let i = 0; i < game.boardHeight; i++) {
            for (let j = 0; j < game.boardWidth; j++) {
                if (game.board[i][j] !== -1) {
                    x = j;
                    y = i;
                    i = game.boardHeight;
                    break;
                }
            }
        }
        const moveMatrix: number[][] = [];
        expandPop(x, y, game, moveMatrix);
    });
});

describe('game utilities', () => {
    const game = createPreparedGame('beginner');

    bench('getOpponent', () => {
        getOpponent('alice', game);
    });

    bench('positionWithinTable - valid position', () => {
        positionWithinTable(5, game, 5);
    });

    bench('positionWithinTable - invalid position', () => {
        positionWithinTable(0, game, 0);
    });

    bench('checkPair - matching pair', () => {
        checkPair(game, 'alice', 'bob');
    });

    bench('checkPair - non-matching pair', () => {
        checkPair(game, 'alice', 'charlie');
    });

    bench('keyFoundOnActiveGame - valid key', () => {
        keyFoundOnActiveGame(game, 'alice', 'key1');
    });

    bench('keyFoundOnActiveGame - invalid key', () => {
        keyFoundOnActiveGame(game, 'alice', 'wrongkey');
    });
});

describe('findOpponent', () => {
    bench('findOpponent - match found', () => {
        const waitingList: Player[] = [
            { name: 'player1', group: 1, level: 'beginner', key: 'k1', game: 1 },
            { name: 'player2', group: 2, level: 'intermediate', key: 'k2', game: 2 },
            { name: 'player3', group: 1, level: 'beginner', key: 'k3', game: 3 },
        ];
        const p1: Player = { name: 'newPlayer', group: 1, level: 'beginner', key: 'k4', game: 0 };
        findOpponent(waitingList, p1);
    });

    bench('findOpponent - no match in large list', () => {
        const waitingList: Player[] = Array.from({ length: 100 }, (_, i) => ({
            name: `player${i}`,
            group: 1,
            level: 'beginner',
            key: `k${i}`,
            game: i,
        }));
        const p1: Player = { name: 'newPlayer', group: 99, level: 'expert', key: 'kNew', game: 0 };
        findOpponent(waitingList, p1);
    });
});

describe('createHash', () => {
    bench('createHash - short string', () => {
        createHash('password123');
    });

    bench('createHash - long string', () => {
        createHash('a'.repeat(1000));
    });
});
