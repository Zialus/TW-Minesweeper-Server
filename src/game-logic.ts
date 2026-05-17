import crypto from 'crypto';
import { Game } from './Game';
import { Player } from './Player';

export function countNeighbours(game: Game, x: number, y: number): number {
    let count = 0;
    let startY = y;
    let startX = x;
    let limitY = y;
    let limitX = x;
    // verifica os limites da tabela
    if (x - 1 >= 0) {
        startX = x - 1;
    }
    if (x + 1 < game.boardWidth) {
        limitX = x + 1;
    }
    if (y - 1 >= 0) {
        startY = y - 1;
    }
    if (y + 1 < game.boardHeight) {
        limitY = y + 1;
    }
    for (let i = startY; i <= limitY; i++) {
        for (let j = startX; j <= limitX; j++) {
            if (game.board[i][j] === -1) {
                count++;
            }
        }
    }
    return count;
}

export function expandPop(x: number, y: number, game: Game, moveMatrix: number[][]): void {
    game.popped[y][x] = true;
    // adicionar casa às destapadas nesta jogada
    moveMatrix.push([x + 1, y + 1, game.board[y][x]]);
    let startY = y;
    let startX = x;
    let limitY = y;
    let limitX = x;
    // verifica os limites da tabela
    if (x - 1 >= 0) {
        startX = x - 1;
    }
    if (x + 1 < game.boardWidth) {
        limitX = x + 1;
    }
    if (y - 1 >= 0) {
        startY = y - 1;
    }
    if (y + 1 < game.boardHeight) {
        limitY = y + 1;
    }
    if (game.board[y][x] === 0) {
        for (let i = startY; i <= limitY; i++) {
            for (let j = startX; j <= limitX; j++) {
                if (!game.popped[i][j]) {
                    expandPop(j, i, game, moveMatrix);
                }
            }
        }
    }
}

export function initializeBoard(level: string): Game {
    const game: Game = {
        level,
        mines: 0,
        board: [[]],
        popped: [[]],
        boardWidth: 0,
        boardHeight: 0,
        player1: '',
        p1score: 0,
        p1key: '',
        player2: '',
        p2key: '',
        p2score: 0,
        turn: '',
    };
    let minesLeft = 0;
    if (level === 'beginner') {
        minesLeft = 10;
        game.mines = 10;
        game.boardHeight = 9;
        game.boardWidth = 9;
    } else if (level === 'intermediate') {
        minesLeft = 40;
        game.mines = 40;
        game.boardWidth = 16;
        game.boardHeight = 16;
    } else if (level === 'expert') {
        minesLeft = 99;
        game.mines = 99;
        game.boardWidth = 30;
        game.boardHeight = 16;
    }
    game.board = Array.from({ length: game.boardHeight });
    game.popped = Array.from({ length: game.boardHeight });
    for (let i = 0; i < game.boardHeight; i++) {
        game.board[i] = Array.from({ length: game.boardWidth });
        game.popped[i] = Array.from({ length: game.boardWidth });
    }
    while (minesLeft > 0) {
        const x = Math.floor(Math.random() * game.boardWidth);
        const y = Math.floor(Math.random() * game.boardHeight);
        if (game.board[y][x] !== -1) {
            game.board[y][x] = -1;
            minesLeft--;
        }
    }
    // contagem das minas que rodeiam cada casa
    for (let i = 0; i < game.boardHeight; i++) {
        for (let j = 0; j < game.boardWidth; j++) {
            if (game.board[i][j] !== -1) {
                game.board[i][j] = countNeighbours(game, j, i);
            }
            game.popped[i][j] = false;
        }
    }
    return game;
}

export function getOpponent(playerName: string, game: Game): string {
    if (playerName === game.player1) {
        return game.player2;
    } else {
        return game.player1;
    }
}

export function positionWithinTable(row: number, game: Game, col: number): boolean {
    return row > 0 && row <= game.boardHeight && col > 0 && col <= game.boardWidth;
}

export function checkPair(game: Game, player: string, adversary: string): boolean {
    return (
        (player === game.player1 && adversary === game.player2) ||
        (player === game.player2 && adversary === game.player1)
    );
}

export function keyFoundOnActiveGame(game: Game, playerName: string, playerKey: string): boolean {
    return (
        (game.player1 === playerName && game.p1key === playerKey) ||
        (game.player2 === playerName && game.p2key === playerKey)
    );
}

export function findOpponent(playerWaitingList: Player[], p1: Player): Player | undefined {
    let p2: Player | undefined;

    playerWaitingList.some((playerWaiting, index) => {
        if (playerWaiting.level === p1.level && playerWaiting.group === p1.group) {
            playerWaitingList.splice(index, 1);
            p2 = playerWaiting;
            return true;
        }
        return false;
    });

    return p2;
}

export function createHash(str: string): string {
    return crypto.createHash('md5').update(str).digest('hex');
}
