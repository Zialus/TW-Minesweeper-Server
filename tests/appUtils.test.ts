import { describe, expect, it } from 'vitest';

import type { Game } from '../src/Game';
import type { Player } from '../src/Player';
import {
    checkPair,
    createHash,
    findOpponent,
    getOpponent,
    isValidName,
    keyFoundOnActiveGame,
    keyFoundOnWaitingList,
    positionWithinTable,
} from '../src/appUtils';

const game: Game = {
    level: 'beginner',
    mines: 10,
    board: [],
    popped: [],
    boardWidth: 9,
    boardHeight: 9,
    player1: 'player1',
    p1score: 0,
    p1key: 'key1',
    player2: 'player2',
    p2key: 'key2',
    p2score: 0,
    turn: 'player1',
};

function createPlayer(name: string, level: string, group: number): Player {
    return { name, level, group, key: `${name}-key`, game: 1 };
}

describe('createHash', () => {
    it('creates a deterministic MD5 hash', () => {
        expect(createHash('passwordsalt')).toBe('b305cadbb3bce54f3aa59c64fec00dea');
    });
});

describe('isValidName', () => {
    it.each(['player1', 'player-name', 'player_name'])('accepts %s', (name) => {
        expect(isValidName(name)).toBe(true);
    });

    it.each(['', 'player name', 'player.name'])('rejects %s', (name) => {
        expect(isValidName(name)).toBe(false);
    });
});

describe('findOpponent', () => {
    it('removes and returns the first player with a matching level and group', () => {
        const first = createPlayer('first', 'expert', 3);
        const opponent = createPlayer('opponent', 'beginner', 2);
        const laterMatch = createPlayer('later', 'beginner', 2);
        const waitingList = [first, opponent, laterMatch];

        expect(findOpponent(createPlayer('joining', 'beginner', 2), waitingList)).toBe(opponent);
        expect(waitingList).toEqual([first, laterMatch]);
    });

    it('leaves the waiting list unchanged when no opponent matches', () => {
        const waitingList = [createPlayer('waiting', 'intermediate', 2)];
        const originalWaitingList = [...waitingList];

        expect(findOpponent(createPlayer('joining', 'beginner', 2), waitingList)).toBeUndefined();
        expect(waitingList).toEqual(originalWaitingList);
    });
});

describe('game participant helpers', () => {
    it('returns the other player name', () => {
        expect(getOpponent('player1', game)).toBe('player2');
        expect(getOpponent('player2', game)).toBe('player1');
    });

    it('accepts a pair of players in either order and rejects other pairs', () => {
        expect(checkPair(game, 'player1', 'player2')).toBe(true);
        expect(checkPair(game, 'player2', 'player1')).toBe(true);
        expect(checkPair(game, 'player1', 'other')).toBe(false);
    });

    it('validates active-game credentials for each player', () => {
        expect(keyFoundOnActiveGame(game, 'player1', 'key1')).toBe(true);
        expect(keyFoundOnActiveGame(game, 'player2', 'key2')).toBe(true);
        expect(keyFoundOnActiveGame(game, 'player1', 'key2')).toBe(false);
        expect(keyFoundOnActiveGame(game, 'other', 'key1')).toBe(false);
    });

    it('validates waiting-list credentials', () => {
        const waitingList = [createPlayer('waiting', 'beginner', 1)];

        expect(keyFoundOnWaitingList('waiting', 'waiting-key', waitingList)).toBe(true);
        expect(keyFoundOnWaitingList('waiting', 'wrong-key', waitingList)).toBe(false);
        expect(keyFoundOnWaitingList('other', 'waiting-key', waitingList)).toBe(false);
    });
});

describe('positionWithinTable', () => {
    it('accepts cells on the table, including its edges', () => {
        expect(positionWithinTable(1, game, 1)).toBe(true);
        expect(positionWithinTable(9, game, 9)).toBe(true);
    });

    it.each([
        [0, 1],
        [10, 1],
        [1, 0],
        [1, 10],
    ])('rejects row %i and column %i outside the table', (row, col) => {
        expect(positionWithinTable(row, game, col)).toBe(false);
    });
});
