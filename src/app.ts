import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mysql from 'mysql';
import crypto from 'crypto';
import Chance from 'chance';
import helmet from 'helmet';
import pino from 'pino';

const logger = pino({
    prettyPrint: {
        levelFirst: true,
        translateTime: true,
        colorize: true,
    },
});

const app = express();
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const dbConnection = mysql.createConnection(process.env.JAWSDB_MARIA_URL);
const chance = new Chance();

// lista de jogadores à espera para jogarem
const playerWaitingList = [] as Player[];

// lista de ligações para server-side events
const openConnections = [] as Connection[];
let gameVar = 0;
const games = [] as Game[];
const regex = /^[a-z0-9_-]+$/i;

// casas reveladas na última jogada
let move = [] as number[][];

const port = process.env.PORT;

// conecção e selecção da base de dados
dbConnection.connect((err) => {
    if (err) {
        logger.error(`error connecting: ${err.stack}`);
        return;
    }

    logger.info(`connected as id ${dbConnection.threadId}`);
});

const server = app.listen(port, () => {
    logger.info('Listening at http://%s:%s', server.address().address, server.address().port);
});

// retorna o 1º oponente válido para p1 se existir se não retorna undefined e adiciona p1 à lista
function findOpponent(p1: Player): Player | undefined {
    let p2;
    for (let i = 0; i < playerWaitingList.length; i++) {
        if (playerWaitingList[i].level === p1.level && playerWaitingList[i].group === p1.group) {
            p2 = playerWaitingList[i];
            playerWaitingList.splice(i, 1); // remove elemento da lista
            break;
        }
    }
    return p2;
}

// envia eventos para os jogaores de um jogo
function sendEvent(gameId: number, e: string, move?: Move) {
    logger.info('Sent Event:');
    for (const item of openConnections) {
        if (item.game === gameId) {
            // se o evento for de inicio de jogo (oponente encontrado)
            // começa o jogo também
            if (e === 'start') {
                if (item.name === games[gameId].player1) {
                    item.connection.write(
                        `data: ${JSON.stringify({ opponent: games[gameId].player2, turn: games[gameId].turn })}\n\n`
                    );
                    logger.info(`${JSON.stringify({ opponent: games[gameId].player2, turn: games[gameId].turn })}\n\n`);
                } else {
                    item.connection.write(
                        `data: ${JSON.stringify({ opponent: games[gameId].player1, turn: games[gameId].turn })}\n\n`
                    );
                    logger.info(`${JSON.stringify({ opponent: games[gameId].player1, turn: games[gameId].turn })}\n\n`);
                }
            }
            // se o evento for uma jogada
            else if (e === 'move') {
                item.connection.write(
                    `data: ${JSON.stringify({ move: { name: move.name, cells: move.cells }, turn: move.turn })}\n\n`
                );
                logger.info(`${JSON.stringify({ move: { name: move.name, cells: move.cells }, turn: move.turn })}\n\n`);
            }
            // se o evento for de fim de jogo
            else if (e === 'end') {
                item.connection.write(
                    `data: ${JSON.stringify({ move: { name: move.name, cells: move.cells }, winner: move.winner })}\n\n`
                );
                logger.info(
                    `${JSON.stringify({ move: { name: move.name, cells: move.cells }, winner: move.winner })}\n\n`
                );
            }
        }
    }
}

function testKey(name: string, key: string, gameId: number): boolean {
    let found = false;

    if (games[gameId] === undefined) {
        for (const item of playerWaitingList) {
            if (item.name === name && item.key === key) {
                found = true;
            }
        }
    } else if (
        (games[gameId].player1 === name && games[gameId].p1key === key) ||
        (games[gameId].player2 === name && games[gameId].p2key === key)
    ) {
        found = true;
    }

    return found;
}

function checkGameStart(gameId: number): boolean {
    const players = [];
    if (games[gameId] === undefined) {
        return false;
    } else {
        for (const item of openConnections) {
            if (item.game === gameId) {
                players.push(item.name);
            }
        }

        if (
            players.length === 2 &&
            ((players[0] === games[gameId].player1 && players[1] === games[gameId].player2) ||
                (players[0] === games[gameId].player2 && players[1] === games[gameId].player1))
        ) {
            return true;
        }
    }
    return false;
}

// método para espalhar minas no início de um jogo
function startGame(level: string, gameId: number, key1: string, key2: string, p1: string, p2: string): void {
    let minesLeft;
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

function clickPop(x: number, y: number, gameId: number): void {
    // se a jogada for uma mina
    if (games[gameId].board[y][x] === -1) {
        games[gameId].popped[y][x] = true;
        // adicionar ao score do jogador
        if (games[gameId].player1 === games[gameId].turn) {
            games[gameId].p1score++;
        } else {
            games[gameId].p2score++;
        }
        // se o score for maior que metade das bombas no jogo, vitória
        if (games[gameId].p1score >= games[gameId].mines / 2) {
            sendEvent(gameId, 'end', {
                name: games[gameId].turn,
                cells: [[x + 1, y + 1, -1]],
                winner: games[gameId].player1,
            });
            increaseScore(games[gameId].player1, games[gameId].level);
            decreaseScore(games[gameId].player2, games[gameId].level);
        } else if (games[gameId].p2score >= games[gameId].mines / 2) {
            sendEvent(gameId, 'end', {
                name: games[gameId].turn,
                cells: [[x + 1, y + 1, -1]],
                winner: games[gameId].player2,
            });
            increaseScore(games[gameId].player2, games[gameId].level);
            decreaseScore(games[gameId].player1, games[gameId].level);
        } else {
            sendEvent(gameId, 'move', {
                name: games[gameId].turn,
                cells: [[x + 1, y + 1, -1]],
                turn: games[gameId].turn,
            });
        }
    }
    // se for uma jogada normal
    else {
        // limpar as celulas da jogada anterior
        move = [];
        // função recursiva
        expandPop(x, y, gameId);
        const p = games[gameId].turn;
        // determinar o próximo turno
        if (games[gameId].turn === games[gameId].player1) {
            games[gameId].turn = games[gameId].player2;
        } else {
            games[gameId].turn = games[gameId].player1;
        }
        // enviar jogada aos jogadores
        sendEvent(gameId, 'move', { name: p, cells: move, turn: games[gameId].turn });
    }
}

function expandPop(x: number, y: number, gameId: number): void {
    games[gameId].popped[y][x] = true;
    // adicionar casa às destapadas nesta jogada
    move.push([x + 1, y + 1, games[gameId].board[y][x]]);
    let startY = y;
    let startX = x;
    let limitY = y;
    let limitX = x;
    // verifica os limites da tabela
    if (x - 1 >= 0) {
        startX = x - 1;
    }
    if (x + 1 < games[gameId].boardWidth) {
        limitX = x + 1;
    }
    if (y - 1 >= 0) {
        startY = y - 1;
    }
    if (y + 1 < games[gameId].boardHeight) {
        limitY = y + 1;
    }
    if (games[gameId].board[y][x] === 0) {
        for (let i = startY; i <= limitY; i++) {
            for (let j = startX; j <= limitX; j++) {
                if (!games[gameId].popped[i][j]) {
                    expandPop(j, i, gameId);
                }
            }
        }
    }
}

function increaseScore(name: string, level: string): void {
    dbConnection.query('SELECT * FROM Rankings WHERE name = ? && level = ?', [name, level], (err, result) => {
        if (err) {
            logger.info(err);
        }

        if (result.length > 0) {
            dbConnection.query(
                'UPDATE Rankings SET score = score + 1 WHERE name = ? && level = ?',
                [name, level],
                (err2, result2) => {
                    if (err2) {
                        logger.info('Failed to updated score', err2);
                    } else {
                        logger.info('Updated score', result2);
                    }
                }
            );
        } else {
            const post = { name, score: 1, level, timestamp: Date.now() };
            dbConnection.query('INSERT INTO Rankings SET ?', [post], (err2, result2) => {
                if (err2) {
                    logger.info('Failed to create new ranking', err2);
                } else {
                    logger.info('Created new ranking', result2);
                }
            });
        }
    });
}

function decreaseScore(name: string, level: string): void {
    dbConnection.query('SELECT * FROM Rankings WHERE name = ? && level = ?', [name, level], (err, result) => {
        if (err) {
            logger.info(err);
        }

        if (result.length > 0) {
            if (result[0].score > 0) {
                dbConnection.query(
                    'UPDATE Rankings SET score = score - 1 WHERE name = ? && level = ?',
                    [name, level],
                    (err2, result2) => {
                        if (err2) {
                            logger.info('Failed to update score', err2);
                        } else {
                            logger.info('Updated score', result2);
                        }
                    }
                );
            }
        } else {
            const post = { name, score: 0, level, timestamp: Date.now() };
            dbConnection.query('INSERT INTO Rankings SET ?', [post], (err2, result2) => {
                if (err2) {
                    logger.info('Failed to create new ranking', err2);
                } else {
                    logger.info('Created new ranking', result2);
                }
            });
        }
    });
}

// função para criar hashes a partir de password e salt
function createHash(str: string): string {
    return crypto.createHash('md5').update(str).digest('hex');
}

// função de registo/login
app.post('/register', (request, response) => {
    // extração do nome e pass do corpo do request
    const name = request.body.name;
    const pass = request.body.pass;
    // verifica se o nome obedece à regex
    if (regex.test(name)) {
        // query à base de dados
        // para descobrir se o utilizador já está registado
        dbConnection.query('SELECT * FROM Users WHERE name = ?', [name], (err, result) => {
            if (err) {
                logger.info(err);
            }
            // utilizador já existe
            if (result.length > 0) {
                logger.info('User exists');
                // resultado da query
                const user = result[0];
                // verificar se a password está correta
                if (createHash(pass + user.salt) === user.pass) {
                    logger.info('Correct Password');
                    response.json({});
                } else {
                    logger.info('Incorrect Password');
                    response.json({ error: 'Utilizador registado com senha diferente' });
                }
            }
            // utilizador nao existe
            else {
                logger.info('New user');
                // gerar salt e hash
                const salt = chance.string({ length: 4 });
                const hash = createHash(pass + salt);
                // guardar na base de dados
                const post = { name, pass: hash, salt };
                dbConnection.query('INSERT INTO Users SET ?', [post], (err2, result2) => {
                    if (err2) {
                        logger.info('Failed while creating new user', err2);
                        response.json({ error: 'Failed to create new user' });
                    } else {
                        logger.info('Created new user', result2);
                        response.json({});
                    }
                });
            }
        });
    } else {
        response.json({ error: 'Nome de utilizador inválido!' });
    }
});

// Ranking
app.post('/ranking', (request, response) => {
    const level = request.body.level;
    dbConnection.query(
        'SELECT * FROM Rankings WHERE level = ? ORDER BY score DESC, timestamp ASC LIMIT 10;',
        [level],
        (err, result) => {
            if (err) {
                logger.info(err);
            }
            response.json({ ranking: result });
        }
    );
});

app.post('/join', (request, response) => {
    if (regex.test(request.body.name)) {
        dbConnection.query('SELECT * FROM Users WHERE name = ?', [request.body.name], (err, result) => {
            if (err) {
                logger.info(err);
            }
            // utilizador já existe
            if (result.length > 0) {
                // resultado da query
                const user = result[0];
                // verificar se a password está correta
                if (createHash(request.body.pass + user.salt) === user.pass) {
                    let gameId;
                    let key;
                    const p1 = {} as Player;
                    let p2: Player | undefined;
                    p1.name = request.body.name;
                    p1.group = request.body.group;
                    p1.level = request.body.level;
                    p1.key = createHash(chance.string({ length: 8 }));
                    key = p1.key;
                    p2 = findOpponent(p1);
                    if (p2 === undefined) {
                        gameId = gameVar++;
                        p1.game = gameId;
                        playerWaitingList.push(p1); // adicona p1 ao fim da fila
                        logger.info(p1.name, ' joined waiting list.\n Waiting list:\n', playerWaitingList);
                    } else {
                        gameId = p2.game;
                        // key = p2.key;
                        startGame(p2.level, p2.game, p1.key, p2.key, p1.name, p2.name);
                        logger.info(
                            'Started game: ',
                            p1.name,
                            ' vs ',
                            p2.name,
                            ' game number ',
                            gameId,
                            ' on ',
                            p2.level
                        );
                    }
                    response.json({ key, game: gameId });
                }
            }
        });
    } else {
        response.json({ error: 'Jogada inválida!' });
    }
});

app.post('/leave', (request, response) => {
    const name = request.body.name;
    const key = request.body.key;
    const gameId = request.body.game;
    if (regex.test(name) && testKey(name, key, gameId)) {
        for (let i = 0; i < playerWaitingList.length; i++) {
            if (playerWaitingList[i].name === name) {
                playerWaitingList.splice(i, 1);
                logger.info(name, ' left waiting list. \nWaiting list:\n ', playerWaitingList);
                break;
            }
        }
        response.json({});
    }
});

app.post('/score', (request, response) => {
    if (regex.test(request.body.name)) {
        dbConnection.query(
            'SELECT * FROM Rankings WHERE name = ? && level = ?',
            [request.body.name, request.body.level],
            (err, result) => {
                if (err) {
                    logger.info(err);
                }
                if (result.length > 0) {
                    response.json({ score: result[0].score });
                } else {
                    response.json({ score: 0 });
                }
            }
        );
    } else {
        response.json({ error: 'Nome de utilizador inválido!' });
    }
});

app.post('/notify', (request, response) => {
    const row = request.body.row;
    const col = request.body.col;
    const gameId = request.body.game;
    const name = request.body.name;
    const key = request.body.key;
    const cells = [];
    logger.info(name, ' plays in [', row, ',', col, ']');
    // verifica a validade do nome e da chave
    if (regex.test(name) && testKey(name, key, gameId)) {
        // verifica se a jogada é válida (turno)
        if (name === games[gameId].turn) {
            // verifica os limites da tabela
            if (row > 0 && row <= games[gameId].boardHeight && col > 0 && col <= games[gameId].boardWidth) {
                // célula já destapada
                if (!games[gameId].popped[col - 1][row - 1]) {
                    logger.info('Accepted.');
                    response.json({}); // jogada aceite
                    // rebenta casa(s)
                    clickPop(row - 1, col - 1, gameId);
                } else {
                    response.json({ error: `Posição ${row},${col} já destapada` });
                }
            } else {
                response.json({ error: 'Jogada inválida!' });
            }
        } else {
            response.json({ error: 'Não é o seu turno!' });
        }
    } else {
        response.json({ error: 'Erro! Não foi possivel validar a jogada' });
    }
});

app.get('/update', (request, response) => {
    const name: string = request.query.name;
    const gameId: number = parseInt(request.query.game, 10);
    const key: string = request.query.key;
    if (regex.test(name) && testKey(name, key, gameId)) {
        // impedir que a conecção se feche
        request.socket.setTimeout(6000000);
        // cabecalho da resposta
        response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });
        response.write('\n');
        // adicionar às conecções abertas
        const connection: Connection = { name, game: gameId, connection: response };
        openConnections.push(connection);
        logger.info('Added player ', name, ' to connections, game ', gameId);

        if (checkGameStart(gameId)) {
            sendEvent(gameId, 'start');
        }

        // no caso do cliente terminar a conecção, remover da lista
        request.on('close', () => {
            for (let i = 0; i < openConnections.length; i++) {
                if (openConnections[i].name === name) {
                    openConnections.splice(i, 1);
                    break;
                }
            }
        });
    } else {
        response.json({ error: 'Erro! Não foi possivel validar o pedido' });
    }
});
