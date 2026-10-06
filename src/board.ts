import { Game } from './Game';

export function countNeighbours(game: Game, x: number, y: number): number {
    let count = 0;
    let startY = y;
    let startX = x;
    let limitY = y;
    let limitX = x;
    if (x > 0) {
        startX = x - 1;
    }
    if (x + 1 < game.boardWidth) {
        limitX = x + 1;
    }
    if (y > 0) {
        startY = y - 1;
    }
    if (y + 1 < game.boardHeight) {
        limitY = y + 1;
    }
    for (let rowIndex = startY; rowIndex <= limitY; rowIndex++) {
        for (let columnIndex = startX; columnIndex <= limitX; columnIndex++) {
            if (game.board[rowIndex][columnIndex] === -1) {
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
        if (cellX > 0) {
            startX = cellX - 1;
        }
        if (cellX + 1 < game.boardWidth) {
            limitX = cellX + 1;
        }
        if (cellY > 0) {
            startY = cellY - 1;
        }
        if (cellY + 1 < game.boardHeight) {
            limitY = cellY + 1;
        }
        if (game.board[cellY][cellX] === 0) {
            for (let rowIndex = startY; rowIndex <= limitY; rowIndex++) {
                for (let columnIndex = startX; columnIndex <= limitX; columnIndex++) {
                    if (!game.popped[rowIndex][columnIndex]) {
                        expandCell(columnIndex, rowIndex);
                    }
                }
            }
        }
    }

    expandCell(x, y);
    return cells;
}
