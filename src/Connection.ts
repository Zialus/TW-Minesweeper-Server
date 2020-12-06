import { Response } from 'express';

export interface Connection {
    playerName: string;
    gameId: number;
    connection: Response;
}
