import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import Chance from 'chance';
import helmet from 'helmet';
import pino from 'pino';
import rateLimit from 'express-rate-limit';
import { AddressInfo } from 'net';
import z from 'zod';

import { Connection } from './Connection';
import { User } from './User';
import { Ranking } from './Ranking';
import { Player } from './Player';
import { Game } from './Game';
import { Move } from './Move';
import {
    expandPop,
    initializeBoard,
    getOpponent,
    positionWithinTable,
    checkPair,
    keyFoundOnActiveGame,
    findOpponent,
    createHash,
} from './game-logic';

// Re-export to suppress unused import warnings for functions used indirectly

const logger = pino({
    transport: {
        target: 'pino-pretty',
        options: {
            ignore: 'hostname',
            translateTime: true,
            colorize: true,
        },
    },
});

const generalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
});

const notifyRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
});

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dbConnection = mysql.createConnection(process.env['JAWSDB_MARIA_URL'] ?? 'mysql://localhost:3306');
const chance = new Chance();

const STATUS_BAD_REQUEST = 400;
const STATUS_OK = 200;
const DEFAULT_TIMEOUT_MS = 6_000_000;

// lista de jogadores à espera para jogarem
const playerWaitingList = [] as Player[];

// lista de ligações para server-side events
const openConnections = [] as Connection[];
let gameVar = 0;
const games = [] as Game[];
const regex = /^[\w-]+$/i;

// casas reveladas na última jogada
let moveMatrix = [] as number[][];

// conecção e selecção da base de dados
dbConnection.connect((err) => {
    if (err) {
        logger.error(`error connecting: ${err.stack ?? 'NO STACK'}`);
        return;
    }

    logger.info(`connected as id ${dbConnection.threadId}`);
});

const DEFAULT_SERVER_PORT = 9876;

const SELECT_FROM_RANKINGS_WHERE_NAME_AND_LEVEL = 'SELECT * FROM Rankings WHERE name = ? && level = ?';

const server = app.listen(process.env['PORT'] ?? DEFAULT_SERVER_PORT, () => {
    const serverAddress = server.address() as AddressInfo;
    logger.info('Listening at http://%s:%d', serverAddress.address, serverAddress.port);
});

function sendStartEvent(gameId: number): void {
    logger.info('Start Sending Start Event...');

    for (const item of openConnections) {
        if (item.gameId === gameId) {
            const game = games[gameId];

            if (game === undefined) {
                logger.error('Game with id %d not Found', gameId);
                return;
            }

            const data = JSON.stringify({ opponent: getOpponent(item.playerName, game), turn: game.turn });
            item.connection.write(`data: ${data}\n\n`);
            logger.info(`${data}\n\n`);
        }
    }

    logger.info('Finished Sending Start Event.');
}

function sendMoveEvent(gameId: number, move: Move): void {
    logger.info('Start Sending Move Event...');

    for (const item of openConnections) {
        if (item.gameId === gameId) {
            const data = JSON.stringify({ move: { name: move.name, cells: move.cells }, turn: move.turn });
            item.connection.write(`data: ${data}\n\n`);
            logger.info(`${data}\n\n`);
        }
    }

    logger.info('Finished Sending Move Event.');
}

function sendEndEvent(gameId: number, move: Move): void {
    logger.info('Start Sending End Event...');

    for (const item of openConnections) {
        if (item.gameId === gameId) {
            const data = JSON.stringify({ move: { name: move.name, cells: move.cells }, winner: move.winner });
            item.connection.write(`data: ${data}\n\n`);
            logger.info(`${data}\n\n`);
        }
    }

    logger.info('Finished Sending End Event.');
}

function keyFoundOnWaitingList(playerName: string, playerKey: string): boolean {
    for (const player of playerWaitingList) {
        if (player.name === playerName && player.key === playerKey) {
            return true;
        }
    }
    return false;
}

function testKey(playerName: string, playerKey: string, gameId: number): boolean {
    const game = games[gameId];
    if (game === undefined) {
        return keyFoundOnWaitingList(playerName, playerKey);
    } else {
        return keyFoundOnActiveGame(game, playerName, playerKey);
    }
}

// espalhar minas no início de um jogo
function startGame(level: string, gameId: number, key1: string, key2: string, p1: string, p2: string): void {
    const game = initializeBoard(level);
    game.player1 = p1;
    game.p1key = key1;
    game.player2 = p2;
    game.p2key = key2;
    game.turn = p1;
    games[gameId] = game;
}

function endGame(gameId: number, x: number, y: number, winningPlayer: string, losingPlayer: string): void {
    const game = games[gameId];
    if (game === undefined) {
        logger.error('Game with id %d not Found', gameId);
        return;
    }

    sendEndEvent(gameId, {
        name: game.turn,
        cells: [[x + 1, y + 1, -1]],
        winner: winningPlayer,
    });
    increaseScore(winningPlayer, game.level);
    decreaseScore(losingPlayer, game.level);
}

function clickPop(x: number, y: number, gameId: number): void {
    const game = games[gameId];
    if (game === undefined) {
        logger.error('Game with id %d not Found', gameId);
        return;
    }

    const mineWasFound = game.board[y][x] === -1;
    if (mineWasFound) {
        game.popped[y][x] = true;
        // adicionar ao score do jogador
        if (game.player1 === game.turn) {
            game.p1score++;
        } else {
            game.p2score++;
        }
        // se o score for maior que metade das bombas no jogo, vitória
        if (game.p1score >= game.mines / 2) {
            endGame(gameId, x, y, game.player1, game.player2);
        } else if (game.p2score >= game.mines / 2) {
            endGame(gameId, x, y, game.player2, game.player1);
        } else {
            sendMoveEvent(gameId, {
                name: game.turn,
                cells: [[x + 1, y + 1, -1]],
                turn: game.turn,
            });
        }
    } else {
        // limpar as celulas da jogada anterior
        moveMatrix = [];
        // função recursiva
        expandPop(x, y, game, moveMatrix);
        const p = game.turn;
        // determinar o próximo turno
        if (game.turn === game.player1) {
            game.turn = game.player2;
        } else {
            game.turn = game.player1;
        }
        // enviar jogada aos jogadores
        sendMoveEvent(gameId, { name: p, cells: moveMatrix, turn: game.turn });
    }
}

function checkGameStart(gameId: number): boolean {
    const game = games[gameId];
    if (game === undefined) {
        return false;
    }
    const players = gatherPlayersFrom(gameId);

    return !!players[0] && !!players[1] && checkPair(game, players[0], players[1]);
}

function gatherPlayersFrom(gameId: number): string[] {
    const players = [];

    for (const item of openConnections) {
        if (item.gameId === gameId) {
            players.push(item.playerName);
        }
    }

    return players;
}

function increaseScore(name: string, level: string): void {
    dbConnection.query(SELECT_FROM_RANKINGS_WHERE_NAME_AND_LEVEL, [name, level], (err, rows) => {
        const result = rows as Ranking[];

        if (err) {
            logger.info(err);
        }

        if (result.length > 0) {
            dbConnection.query(
                'UPDATE Rankings SET score = score + 1 WHERE name = ? && level = ?',
                [name, level],
                (err2, result2) => {
                    if (err2) {
                        logger.info('Failed to update score: %o', err2);
                    } else {
                        logger.info('Updated score: %o', result2);
                    }
                },
            );
        } else {
            const post = { name, score: 1, level, timestamp: Date.now() };
            dbConnection.query('INSERT INTO Rankings SET ?', [post], (err2, result2) => {
                if (err2) {
                    logger.info('Failed to create new ranking: %o', err2);
                } else {
                    logger.info('Created new ranking: %o', result2);
                }
            });
        }
    });
}

function decreaseScore(name: string, level: string): void {
    dbConnection.query(SELECT_FROM_RANKINGS_WHERE_NAME_AND_LEVEL, [name, level], (err, rows) => {
        const result = rows as Ranking[];

        if (err) {
            logger.info(err);
        }

        if (result.length > 0 && result[0]) {
            if (result[0].score > 0) {
                dbConnection.query(
                    'UPDATE Rankings SET score = score - 1 WHERE name = ? && level = ?',
                    [name, level],
                    (err2, result2) => {
                        if (err2) {
                            logger.info('Failed to update score: %o', err2);
                        } else {
                            logger.info('Updated score: %o', result2);
                        }
                    },
                );
            }
        } else {
            const post = { name, score: 0, level, timestamp: Date.now() };
            dbConnection.query('INSERT INTO Rankings SET ?', [post], (err2, result2) => {
                if (err2) {
                    logger.info('Failed to create new ranking: %o', err2);
                } else {
                    logger.info('Created new ranking: %o', result2);
                }
            });
        }
    });
}

// Deals with both registration and login
app.post('/register', generalRateLimit, (request, response) => {
    const bodySchema = z.object({
        name: z.string().min(1),
        pass: z.string(),
    });

    const parse = bodySchema.safeParse(request.body);

    if (!parse.success) {
        response.status(STATUS_BAD_REQUEST).json(parse.error);
        return;
    }
    const { name, pass } = parse.data;

    // Checks if name follows regex rules
    if (!regex.test(name)) {
        response.json({ error: 'Nome de utilizador inválido!' });
        return;
    }

    dbConnection.query('SELECT * FROM Users WHERE name = ?', [name], (err, rows) => {
        const result = rows as User[];
        if (err) {
            logger.info(err);
        }
        if (result.length > 0 && result[0]) {
            logger.info('User exists');
            const user = result[0];
            const checkIfPasswordIsCorrect = createHash(pass + user.salt) === user.pass;
            if (checkIfPasswordIsCorrect) {
                logger.info('Correct Password');
                response.json({});
            } else {
                logger.info('Incorrect Password');
                response.json({ error: 'Utilizador registado com senha diferente' });
            }
        } else {
            logger.info('New user');
            const salt = chance.string({ length: 4 });
            const hash = createHash(pass + salt);

            const post = { name, pass: hash, salt };
            dbConnection.query('INSERT INTO Users SET ?', [post], (err2, result2) => {
                if (err2) {
                    logger.info('Failed while creating new user: %o', err2);
                    response.json({ error: 'Failed to create new user' });
                } else {
                    logger.info('Created new user: %o', result2);
                    response.json({});
                }
            });
        }
    });
});

app.post('/ranking', generalRateLimit, (request, response) => {
    const bodySchema = z.object({
        level: z.string().min(1),
    });

    const parse = bodySchema.safeParse(request.body);

    if (!parse.success) {
        response.status(STATUS_BAD_REQUEST).json(parse.error);
        return;
    }
    const { level } = parse.data;

    dbConnection.query(
        'SELECT * FROM Rankings WHERE level = ? ORDER BY score DESC, timestamp ASC LIMIT 10;',
        [level],
        (err, rows) => {
            const result = rows as Ranking[];
            if (err) {
                logger.info(err);
            }
            response.json({ ranking: result });
        },
    );
});

app.post('/join', generalRateLimit, (request, response) => {
    const bodySchema = z.object({
        name: z.string().min(1),
        pass: z.string(),
        group: z.number().nonnegative(),
        level: z.string().min(1),
    });

    const parse = bodySchema.safeParse(request.body);

    if (!parse.success) {
        response.status(STATUS_BAD_REQUEST).json(parse.error);
        return;
    }
    const { name, pass, group, level } = parse.data;

    if (!regex.test(name)) {
        response.json({ error: 'Jogada inválida!' });
        return;
    }

    dbConnection.query('SELECT * FROM Users WHERE name = ?', [name], (err, rows) => {
        const result = rows as User[];
        if (err) {
            logger.info(err);
        }
        // utilizador já existe
        if (result.length > 0 && result[0]) {
            // resultado da query
            const user = result[0];
            // verificar se a password está correta
            if (createHash(pass + user.salt) === user.pass) {
                let gameId;
                const p1 = {} as Player;
                p1.name = name;
                p1.group = group;
                p1.level = level;
                p1.key = createHash(chance.string({ length: 8 }));

                const p2 = findOpponent(playerWaitingList, p1);

                if (p2 === undefined) {
                    gameVar++;
                    gameId = gameVar;
                    p1.game = gameId;
                    playerWaitingList.push(p1); // adicona p1 ao fim da fila
                    logger.info('%s joined waiting list.\n Waiting list: %o', p1.name, playerWaitingList);
                } else {
                    gameId = p2.game;
                    startGame(p2.level, p2.game, p1.key, p2.key, p1.name, p2.name);
                    logger.info(`Started game: ${p1.name} vs ${p2.name} -- Game number:${gameId} -- Level:${p2.level}`);
                }
                response.json({ key: p1.key, game: gameId });
            }
        }
    });
});

app.post('/leave', (request, response) => {
    const bodySchema = z.object({
        game: z.number().nonnegative(),
        name: z.string().min(1),
        key: z.string().min(1),
    });

    const parse = bodySchema.safeParse(request.body);

    if (!parse.success) {
        response.status(STATUS_BAD_REQUEST).json(parse.error);
        return;
    }
    const { game, name, key } = parse.data;

    if (validNameAndKey(name, key, game)) {
        playerWaitingList.some((playerWaiting, index) => {
            if (playerWaiting.name === name) {
                playerWaitingList.splice(index, 1);
                logger.info('%s left waiting list.\n Waiting list: %o', name, playerWaitingList);
                return true;
            }
            return false;
        });

        response.json({});
    }
});

app.post('/score', generalRateLimit, (request, response) => {
    const bodySchema = z.object({
        name: z.string().min(1),
        level: z.string().min(1),
    });

    const parse = bodySchema.safeParse(request.body);

    if (!parse.success) {
        response.status(STATUS_BAD_REQUEST).json(parse.error);
        return;
    }
    const { name, level } = parse.data;

    if (regex.test(name)) {
        dbConnection.query(SELECT_FROM_RANKINGS_WHERE_NAME_AND_LEVEL, [name, level], (err, rows) => {
            const result = rows as Ranking[];
            if (err) {
                logger.info(err);
            }
            if (result.length > 0 && result[0]) {
                response.json({ score: result[0].score });
            } else {
                response.json({ score: 0 });
            }
        });
    } else {
        response.json({ error: 'Nome de utilizador inválido!' });
    }
});

function validNameAndKey(name: string, key: string, game: number): boolean {
    return regex.test(name) && testKey(name, key, game);
}

app.post('/notify', notifyRateLimit, (request, response) => {
    const bodySchema = z.object({
        row: z.number().nonnegative(),
        col: z.number().nonnegative(),
        game: z.number().nonnegative(),
        name: z.string().min(1),
        key: z.string().min(1),
    });

    const parse = bodySchema.safeParse(request.body);

    if (!parse.success) {
        response.status(STATUS_BAD_REQUEST).json(parse.error);
        return;
    }
    const { row, col, game, name, key } = parse.data;

    logger.info(`${name} plays in [${row},${col}]`);
    // verifica a validade do nome e da chave
    if (!validNameAndKey(name, key, game)) {
        response.json({ error: 'Erro! Não foi possivel validar a jogada' });
        return;
    }

    const gameInGamesList = games[game];
    if (gameInGamesList === undefined) {
        logger.error('Game with id %d not Found', game);
        return;
    }

    // verifica se a jogada é válida (turno)
    if (name !== gameInGamesList.turn) {
        response.json({ error: 'Não é o seu turno!' });
        return;
    }

    // verifica os limites da tabela
    if (!positionWithinTable(row, gameInGamesList, col)) {
        response.json({ error: 'Jogada inválida!' });
        return;
    }

    // célula já destapada
    if (gameInGamesList.popped[col - 1][row - 1]) {
        response.json({ error: `Posição ${row},${col} já destapada` });
        return;
    }

    logger.info('Accepted.');
    response.json({}); // jogada aceite
    // rebenta casa(s)
    clickPop(row - 1, col - 1, game);
});

app.get('/update', (request, response) => {
    const bodySchema = z.object({
        game: z.string().min(1),
        name: z.string().min(1),
        key: z.string().min(1),
    });

    const parse = bodySchema.safeParse(request.query);

    if (!parse.success) {
        response.status(STATUS_BAD_REQUEST).json(parse.error);
        return;
    }
    const { game, name, key } = parse.data;

    const gameId = parseInt(game, 10);

    if (!validNameAndKey(name, key, gameId)) {
        response.json({ error: 'Erro! Não foi possivel validar o pedido' });
        return;
    }

    // impedir que a conecção se feche
    request.socket.setTimeout(DEFAULT_TIMEOUT_MS);
    // cabecalho da resposta
    response.writeHead(STATUS_OK, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    response.write('\n');
    // adicionar às conecções abertas
    const connection: Connection = { playerName: name, gameId, connection: response };
    openConnections.push(connection);
    logger.info(`Added player: ${name} to connections -- Game: ${gameId}`);

    if (checkGameStart(gameId)) {
        sendStartEvent(gameId);
    }

    // no caso do cliente terminar a conecção, remover da lista
    request.on('close', () => {
        openConnections.some((connection, index) => {
            if (connection.playerName === name) {
                openConnections.splice(index, 1);
                return true;
            }
            return false;
        });
    });
});
