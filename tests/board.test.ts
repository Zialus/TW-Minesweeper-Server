import { describe, expect, it } from 'vitest';

import type { Game } from '../src/Game';
import { countNeighbours, expandPop } from '../src/board';

function createGame(board: number[][]): Game {
    const boardHeight = board.length;
    const boardWidth = board[0].length;

    return {
        level: 'beginner',
        mines: 1,
        board,
        popped: Array.from({ length: boardHeight }, () => Array.from({ length: boardWidth }, () => false)),
        boardWidth,
        boardHeight,
        player1: 'player1',
        p1score: 0,
        p1key: 'key1',
        player2: 'player2',
        p2key: 'key2',
        p2score: 0,
        turn: 'player1',
    };
}

describe('countNeighbours', () => {
    it('counts mines around a cell in the middle of the board', () => {
        const game = createGame([
            [0, -1, 0],
            [-1, 0, -1],
            [0, 0, 0],
        ]);

        expect(countNeighbours(game, 1, 1)).toBe(3);
    });

    it('counts mines at the corner without reading outside the board', () => {
        const game = createGame([
            [0, -1],
            [-1, 0],
        ]);

        expect(countNeighbours(game, 0, 0)).toBe(2);
    });

    it('counts mines at the bottom-right edge without reading outside the board', () => {
        const game = createGame([
            [-1, 0],
            [0, 0],
        ]);

        expect(countNeighbours(game, 1, 1)).toBe(1);
    });

    it('uses board width for horizontal bounds on a rectangular board', () => {
        const game = createGame([
            [0, 0, -1, 0],
            [0, 0, 0, 0],
        ]);

        expect(countNeighbours(game, 1, 0)).toBe(1);
    });

    it('uses board height for vertical bounds on a rectangular board', () => {
        const game = createGame([
            [0, 0],
            [0, 0],
            [-1, 0],
            [0, 0],
        ]);

        expect(countNeighbours(game, 0, 1)).toBe(1);
    });

    it('does not count mines more than one cell away horizontally', () => {
        const game = createGame([
            [-1, 0, 0, -1],
            [0, 0, 0, 0],
        ]);

        expect(countNeighbours(game, 2, 0)).toBe(1);
        expect(countNeighbours(game, 1, 0)).toBe(0);
    });
});

describe('expandPop', () => {
    it('reveals the connected zero region and its numbered border', () => {
        const game = createGame([
            [1, -1, 1],
            [1, 1, 1],
            [0, 0, 0],
        ]);

        const cells = expandPop(0, 2, game);

        expect(cells).toEqual([
            [1, 3, 0],
            [1, 2, 1],
            [2, 2, 1],
            [2, 3, 0],
            [3, 2, 1],
            [3, 3, 0],
        ]);
        expect(game.popped).toEqual([
            [false, false, false],
            [true, true, true],
            [true, true, true],
        ]);
    });

    it('reveals only the selected numbered cell when it is not zero', () => {
        const game = createGame([
            [1, -1],
            [1, 1],
        ]);

        const cells = expandPop(0, 0, game);

        expect(cells).toEqual([[1, 1, 1]]);
        expect(game.popped).toEqual([
            [true, false],
            [false, false],
        ]);
    });

    it('expands zero cells down to the board edge', () => {
        const game = createGame([
            [1, 1, 1],
            [1, 0, 1],
            [1, 0, 1],
        ]);

        const cells = expandPop(1, 1, game);

        expect(cells).toEqual([
            [2, 2, 0],
            [1, 1, 1],
            [2, 1, 1],
            [3, 1, 1],
            [1, 2, 1],
            [3, 2, 1],
            [1, 3, 1],
            [2, 3, 0],
            [3, 3, 1],
        ]);
        expect(game.popped).toEqual([
            [true, true, true],
            [true, true, true],
            [true, true, true],
        ]);
    });

    it('expands connected zero cells to the left of the selected cell', () => {
        const game = createGame([
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
        ]);

        const cells = expandPop(2, 2, game);

        expect(cells).toEqual([
            [3, 3, 0],
            [2, 2, 0],
            [1, 1, 0],
            [2, 1, 0],
            [3, 1, 0],
            [3, 2, 0],
            [2, 3, 0],
            [1, 2, 0],
            [1, 3, 0],
        ]);
        expect(game.popped).toEqual([
            [true, true, true],
            [true, true, true],
            [true, true, true],
        ]);
    });

    it('expands a zero cell at the top edge without leaving the board', () => {
        const game = createGame([
            [0, 1],
            [1, 2],
        ]);

        const cells = expandPop(0, 0, game);

        expect(cells).toEqual([
            [1, 1, 0],
            [2, 1, 1],
            [1, 2, 1],
            [2, 2, 2],
        ]);
        expect(game.popped).toEqual([
            [true, true],
            [true, true],
        ]);
    });
});
