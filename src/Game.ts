interface Game {
    level: string;
    mines: number;
    board: number[][];
    popped: boolean[][];
    boardWidth: number;
    boardHeight: number;
    player1: string;
    p1score: number;
    p1key: string;
    player2: string;
    p2key: string;
    p2score: number;
    turn: string;
}
