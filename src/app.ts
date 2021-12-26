import express from 'express';
import cors from 'cors';
import mysql, { MysqlError } from 'mysql';
import crypto from 'crypto';
import Chance from 'chance';
import helmet from 'helmet';
import pino from 'pino';
import { AddressInfo } from 'net';
import Joi from 'joi';

import { Connection } from './Connection';
import { User } from './User';
import { Ranking } from './Ranking';
import { Player } from './Player';
import { Game } from './Game';
import { Move } from './Move';

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

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dbConnection = mysql.createConnection(process.env['JAWSDB_MARIA_URL'] || 'mysql://localhost:3306');
const chance = new Chance();

const STATUS_BAD_REQUEST = 400;
const STATUS_OK = 200;
const DEFAULT_TIMEOUT_MS = 6000000;

// lista de jogadores à espera para jogarem
const playerWaitingList = [] as Player[];

// lista de ligações para server-side events
const openConnections = [] as Connection[];
let gameVar = 0;
const games = [] as Game[];
const regex = /^[a-z0-9_-]+$/i;

// casas reveladas na última jogada
let moveMatrix = [] as number[][];

// conecção e selecção da base de dados
dbConnection.connect((err: MysqlError) => {
    if (err) {
        logger.error(`error connecting: ${err.stack ?? 'NO STACK'}`);
        return;
    }

    logger.info(`connected as id ${dbConnection.threadId ?? 'NO ID'}`);
});

const DEFAULT_SERVER_PORT = 9876;

const SELECT_FROM_RANKINGS_WHERE_NAME_AND_LEVEL = 'SELECT * FROM Rankings WHERE name = ? && level = ?';

const server = app.listen(process.env['PORT'] || DEFAULT_SERVER_PORT, () => {
    const serverAddress = server.address() as AddressInfo;
    logger.info('Listening at http://%s:%s', serverAddress.address, serverAddress.port);
});

/**
 * Returns the first valid opponent for player1, if he exists, otherwise returns undefined.
 * The calling side will need to add player1 to the waiting list
 */
function findOpponent(p1: Player): Player | undefined {
    let p2: Player | undefined = undefined;

    playerWaitingList.some((playerWaiting, index) => {
        if (playerWaiting.level === p1.level && playerWaiting.group === p1.group) {
            playerWaitingList.splice(index, 1); // remove element from the list
            p2 = playerWaiting;
            return true; // found opponent, break out of the loop
        }
        return false; // didnt find opponent, keep loop going
    });

    return p2;
}

function getOpponent(playerName: string, game: Game): string {
    if (playerName === game.player1) {
        return game.player2;
    } else {
        return game.player1;
    }
}

function sendStartEvent(gameId: number): void {
    logger.info('Start Sending Start Event...');

    for (const item of openConnections) {
        if (item.gameId === gameId) {
            const game = games[gameId];

            if (game === undefined) {
                logger.error('Game with id %s not Found', gameId);
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

function keyFoundOnActiveGame(game: Game, playerName: string, playerKey: string): boolean {
    return (
        (game.player1 === playerName && game.p1key === playerKey) ||
        (game.player2 === playerName && game.p2key === playerKey)
    );
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

function checkPair(game: Game, player: string, adversary: string): boolean {
    return (
        (player === game.player1 && adversary === game.player2) ||
        (player === game.player2 && adversary === game.player1)
    );
}

// espalhar minas no início de um jogo
function startGame(level: string, gameId: number, key1: string, key2: string, p1: string, p2: string): void {
    let minesLeft = 0;
    const game: Game = {
        level,
        mines: 0,
        board: [[]],
        popped: [[]],
        boardWidth: 0,
        boardHeight: 0,
        player1: p1,
        p1score: 0,
        p1key: key1,
        player2: p2,
        p2key: key2,
        p2score: 0,
        turn: p1,
    };
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
        // escolhe duas coordenadas aleatórias
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
            game.popped[i][j] = false; // inicializa todas as células da matriz popped
        }
    }
    games[gameId] = game;
}

function countNeighbours(game: Game, x: number, y: number): number {
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

function endGame(gameId: number, x: number, y: number, winningPlayer: string, losingPlayer: string): void {
    const game = games[gameId];
    if (game === undefined) {
        logger.error('Game with id %s not Found', gameId);
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
        logger.error('Game with id %s not Found', gameId);
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
        expandPop(x, y, game);
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

function expandPop(x: number, y: number, game: Game): void {
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
                    expandPop(j, i, game);
                }
            }
        }
    }
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
                }
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
                    }
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

// função para criar hashes a partir de password e salt
function createHash(str: string): string {
    return crypto.createHash('md5').update(str).digest('hex');
}

// Deals with both registration and login
app.post('/register', (request, response) => {
    type requestType = { name: string; pass: string };

    const bodySchema = Joi.object<requestType>({
        name: Joi.string().required(),
        pass: Joi.string().required().allow(''),
    });

    const { error, value } = bodySchema.validate(request.body) as {
        error: Joi.ValidationError | undefined;
        value: requestType;
    };
    if (error) {
        response.status(STATUS_BAD_REQUEST).json(error);
        return;
    }
    const { name, pass } = value;

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

app.post('/ranking', (request, response) => {
    type requestType = { level: string };

    const bodySchema = Joi.object<requestType>({
        level: Joi.string().required(),
    });

    const { error, value } = bodySchema.validate(request.body) as {
        error: Joi.ValidationError | undefined;
        value: requestType;
    };
    if (error) {
        response.status(STATUS_BAD_REQUEST).json(error);
        return;
    }
    const { level } = value;

    dbConnection.query(
        'SELECT * FROM Rankings WHERE level = ? ORDER BY score DESC, timestamp ASC LIMIT 10;',
        [level],
        (err, rows) => {
            const result = rows as Ranking[];
            if (err) {
                logger.info(err);
            }
            response.json({ ranking: result });
        }
    );
});

app.post('/join', (request, response) => {
    type requestType = {
        name: string;
        pass: string;
        group: number;
        level: string;
    };

    const bodySchema = Joi.object<requestType>({
        name: Joi.string().required(),
        pass: Joi.string().required().allow(''),
        group: Joi.number().required(),
        level: Joi.string().required(),
    });

    const { error, value } = bodySchema.validate(request.body) as {
        error: Joi.ValidationError | undefined;
        value: requestType;
    };
    if (error) {
        response.status(STATUS_BAD_REQUEST).json(error);
        return;
    }
    const { name, pass, group, level } = value;

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

                const p2 = findOpponent(p1);

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
    type requestType = { game: number; name: string; key: string };

    const bodySchema = Joi.object<requestType>({
        game: Joi.number().required(),
        name: Joi.string().required(),
        key: Joi.string().required(),
    });

    const { error, value } = bodySchema.validate(request.body) as {
        error: Joi.ValidationError | undefined;
        value: requestType;
    };
    if (error) {
        response.status(STATUS_BAD_REQUEST).json(error);
        return;
    }
    const { game, name, key } = value;

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

app.post('/score', (request, response) => {
    type requestType = { name: string; level: string };

    const bodySchema = Joi.object<requestType>({
        name: Joi.string().required(),
        level: Joi.string().required(),
    });

    const { error, value } = bodySchema.validate(request.body) as {
        error: Joi.ValidationError | undefined;
        value: requestType;
    };
    if (error) {
        response.status(STATUS_BAD_REQUEST).json(error);
        return;
    }
    const { name, level } = value;

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

function positionWithinTable(row: number, game: Game, col: number): boolean {
    return row > 0 && row <= game.boardHeight && col > 0 && col <= game.boardWidth;
}

function validNameAndKey(name: string, key: string, game: number): boolean {
    return regex.test(name) && testKey(name, key, game);
}

app.post('/notify', (request, response) => {
    type requestType = {
        row: number;
        col: number;
        game: number;
        name: string;
        key: string;
    };

    const bodySchema = Joi.object<requestType>({
        row: Joi.number().required(),
        col: Joi.number().required(),
        game: Joi.number().required(),
        name: Joi.string().required(),
        key: Joi.string().required(),
    });

    const { error, value } = bodySchema.validate(request.body) as {
        error: Joi.ValidationError | undefined;
        value: requestType;
    };
    if (error) {
        response.status(STATUS_BAD_REQUEST).json(error);
        return;
    }
    const { row, col, game, name, key } = value;

    logger.info(`${name} plays in [${row},${col}]`);
    // verifica a validade do nome e da chave
    if (!validNameAndKey(name, key, game)) {
        response.json({ error: 'Erro! Não foi possivel validar a jogada' });
        return;
    }

    const gameInGamesList = games[game];
    if (gameInGamesList === undefined) {
        logger.error('Game with id %s not Found', game);
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
    type requestType = {
        game: string;
        name: string;
        key: string;
    };

    const bodySchema = Joi.object<requestType>({
        game: Joi.string().required(),
        name: Joi.string().required(),
        key: Joi.string().required(),
    });

    const { error, value } = bodySchema.validate(request.query) as {
        error: Joi.ValidationError | undefined;
        value: requestType;
    };
    if (error) {
        response.status(STATUS_BAD_REQUEST).json(error);
        return;
    }
    const { game, name, key } = value;

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
