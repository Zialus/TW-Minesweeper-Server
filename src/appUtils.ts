import crypto from 'crypto';

import type { Game } from './Game';
import type { Player } from './Player';

const validNamePattern = /^[\w-]+$/i;

export function createHash(value: string): string {
    return crypto.createHash('md5').update(value).digest('hex');
}

export function isValidName(name: string): boolean {
    return validNamePattern.test(name);
}

export function findOpponent(player: Player, waitingList: Player[]): Player | undefined {
    const opponentIndex = waitingList.findIndex(
        (waitingPlayer) => waitingPlayer.level === player.level && waitingPlayer.group === player.group,
    );

    if (opponentIndex === -1) {
        return undefined;
    }

    return waitingList.splice(opponentIndex, 1)[0];
}

export function getOpponent(playerName: string, game: Game): string {
    if (playerName === game.player1) {
        return game.player2;
    } else {
        return game.player1;
    }
}

export function keyFoundOnActiveGame(game: Game, playerName: string, playerKey: string): boolean {
    return (
        (game.player1 === playerName && game.p1key === playerKey) ||
        (game.player2 === playerName && game.p2key === playerKey)
    );
}

export function keyFoundOnWaitingList(playerName: string, playerKey: string, waitingList: Player[]): boolean {
    for (const player of waitingList) {
        if (player.name === playerName && player.key === playerKey) {
            return true;
        }
    }
    return false;
}

export function checkPair(game: Game, player: string, adversary: string): boolean {
    return (
        (player === game.player1 && adversary === game.player2) ||
        (player === game.player2 && adversary === game.player1)
    );
}

export function positionWithinTable(row: number, game: Game, col: number): boolean {
    return row > 0 && row <= game.boardHeight && col > 0 && col <= game.boardWidth;
}
