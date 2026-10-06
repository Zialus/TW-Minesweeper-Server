import { Game } from './Game';

export function countNeighbours(game: Game, x: number, y: number): number {
    let count = 0;
    let startY = y;
    let startX = x;
    let limitY = y;
    let limitX = x;
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

export function expandPop(x: number, y: number, game: Game): number[][] {
    const cells: number[][] = [];

    function expandCell(cellX: number, cellY: number): void {
        game.popped[cellY][cellX] = true;
        cells.push([cellX + 1, cellY + 1, game.board[cellY][cellX]]);
        let startY = cellY;
        let startX = cellX;
        let limitY = cellY;
        let limitX = cellX;
        if (cellX - 1 >= 0) {
            startX = cellX - 1;
        }
        if (cellX + 1 < game.boardWidth) {
            limitX = cellX + 1;
        }
        if (cellY - 1 >= 0) {
            startY = cellY - 1;
        }
        if (cellY + 1 < game.boardHeight) {
            limitY = cellY + 1;
        }
        if (game.board[cellY][cellX] === 0) {
            for (let i = startY; i <= limitY; i++) {
                for (let j = startX; j <= limitX; j++) {
                    if (!game.popped[i][j]) {
                        expandCell(j, i);
                    }
                }
            }
        }
    }

    expandCell(x, y);
    return cells;
}
