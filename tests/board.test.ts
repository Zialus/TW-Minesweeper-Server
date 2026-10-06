import { describe, expect, it } from 'vitest';

import { Game } from '../src/Game';
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
});

describe('expandPop', () => {
    it('reveals the connected zero region and its numbered border', () => {
        const game = createGame([
            [1, -1, 1],
            [1, 1, 1],
            [0, 0, 0],
        ]);

        const cells = expandPop(0, 2, game);

        expect(cells).toHaveLength(6);
        expect(cells).not.toContainEqual([2, 1, -1]);
        expect(cells).toContainEqual([1, 3, 0]);
        expect(cells).toContainEqual([2, 2, 1]);
        expect(game.popped[2]).toEqual([true, true, true]);
        expect(game.popped[0][1]).toBe(false);
    });

    it('reveals only the selected numbered cell when it is not zero', () => {
        const game = createGame([
            [1, -1],
            [1, 1],
        ]);

        expect(expandPop(0, 0, game)).toEqual([[1, 1, 1]]);
        expect(game.popped).toEqual([
            [true, false],
            [false, false],
        ]);
    });
});
