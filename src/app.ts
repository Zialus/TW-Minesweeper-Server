import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mysql from 'mysql';
import crypto from 'crypto';
import Chance from 'chance';

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const db_con = mysql.createConnection(process.env.JAWSDB_MARIA_URL);
const chance = new Chance();

//lista de jogadores à espera para jogarem
const waiting_list = [];

// lista de ligações para server-side events
const openConnections = [];
let gameVar = 0;
const games = [];
const regex = /^[a-z0-9_-]+$/i;

// casas reveladas na última jogada
let move = [];

const port = process.env.PORT;

// conecção e selecção da base de dados
db_con.connect(function(err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }

    console.log('connected as id ' + db_con.threadId);
});

const server = app.listen(port, function() {
    console.log('Listening at http://%s:%s', server.address().address, server.address().port);
});

//retorna o 1º oponente válido para p1 se existir se não retorna undefined e adiciona p1 à lista
function findOpponent(p1) {
    let p2;
    for (let i = 0; i < waiting_list.length; i++) {
        if (waiting_list[i].level === p1.level && waiting_list[i].group === p1.group) {
            p2 = waiting_list[i];
            waiting_list.splice(i, 1); //remove elemento da lista
            break;
        }
    }
    return p2;
}

// envia eventos para os jogaores de um jogo
function sendEvent(game_id, e, move) {
    console.log('Sent Event:');
    for (let i = 0; i < openConnections.length; i++) {
        if (openConnections[i].game == game_id) {
            // se o evento for de inicio de jogo (oponente encontrado)
            // começa o jogo também
            if (e == 'start') {
                if (openConnections[i].name == games[game_id].player1) {
                    openConnections[i].connection.write(
                        'data: ' +
                            JSON.stringify({ opponent: games[game_id].player2, turn: games[game_id].turn }) +
                            '\n\n'
                    );
                    console.log(
                        JSON.stringify({ opponent: games[game_id].player2, turn: games[game_id].turn }) + '\n\n'
                    );
                } else {
                    openConnections[i].connection.write(
                        'data: ' +
                            JSON.stringify({ opponent: games[game_id].player1, turn: games[game_id].turn }) +
                            '\n\n'
                    );
                    console.log(
                        JSON.stringify({ opponent: games[game_id].player1, turn: games[game_id].turn }) + '\n\n'
                    );
                }
            }
            // se o evento for uma jogada
            else if (e == 'move') {
                openConnections[i].connection.write(
                    'data: ' +
                        JSON.stringify({ move: { name: move.name, cells: move.cells }, turn: move.turn }) +
                        '\n\n'
                );
                console.log(JSON.stringify({ move: { name: move.name, cells: move.cells }, turn: move.turn }) + '\n\n');
            }
            // se o evento for de fim de jogo
            else if (e == 'end') {
                openConnections[i].connection.write(
                    'data: ' +
                        JSON.stringify({ move: { name: move.name, cells: move.cells }, winner: move.winner }) +
                        '\n\n'
                );
                console.log(
                    JSON.stringify({ move: { name: move.name, cells: move.cells }, winner: move.winner }) + '\n\n'
                );
            }
        }
    }
}

function testKey(name, key, game_id) {
    let found = false;

    if (games[game_id] === undefined) {
        for (let i = 0; i < waiting_list.length; i++)
            if (waiting_list[i].name == name && waiting_list[i].key == key) found = true;
    } else if (
        (games[game_id].player1 == name && games[game_id].p1key == key) ||
        (games[game_id].player2 == name && games[game_id].p2key == key)
    )
        found = true;

    return found;
}

function checkGameStart(game_id) {
    const players = [];
    if (games[game_id] === undefined) return false;
    else {
        for (let i = 0; i < openConnections.length; i++) {
            if (openConnections[i].game == game_id) players.push(openConnections[i].name);
        }

        if (
            players.length == 2 &&
            ((players[0] == games[game_id].player1 && players[1] == games[game_id].player2) ||
                (players[0] == games[game_id].player2 && players[1] == games[game_id].player1))
        )
            return true;
    }
    return false;
}

// método para espalhar minas no início de um jogo
function startGame(level, game_id, key1, key2, p1, p2) {
    let minesLeft;
    const game = {
        level: level,
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
        turn: p1
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
    game.board = new Array(game.boardHeight);
    game.popped = new Array(game.boardHeight);
    for (let i = 0; i < game.boardHeight; i++) {
        game.board[i] = new Array(game.boardWidth);
        game.popped[i] = new Array(game.boardWidth);
    }
    while (minesLeft > 0) {
        //escolhe duas coordenadas aleatórias
        const x = Math.floor(Math.random() * game.boardWidth);
        const y = Math.floor(Math.random() * game.boardHeight);
        if (game.board[y][x] != -1) {
            game.board[y][x] = -1;
            minesLeft--;
        }
    }
    //contagem das minas que rodeiam cada casa
    for (let i = 0; i < game.boardHeight; i++) {
        for (let j = 0; j < game.boardWidth; j++) {
            if (game.board[i][j] != -1) {
                game.board[i][j] = countNeighbours(game, j, i);
            }
            game.popped[i][j] = false; // inicializa todas as células da matriz popped
        }
    }
    games[game_id] = game;
}

function countNeighbours(game, x, y) {
    let count = 0;
    let strt_i = y,
        strt_j = x,
        lm_i = y,
        lm_j = x;
    //verifica os limites da tabela
    if (x - 1 >= 0) strt_j = x - 1;
    if (x + 1 < game.boardWidth) lm_j = x + 1;
    if (y - 1 >= 0) strt_i = y - 1;
    if (y + 1 < game.boardHeight) lm_i = y + 1;
    for (let i = strt_i; i <= lm_i; i++) {
        for (let j = strt_j; j <= lm_j; j++) {
            if (game.board[i][j] === -1) count++;
        }
    }
    return count;
}

function clickPop(x, y, game_id) {
    // se a jogada for uma mina
    if (games[game_id].board[y][x] === -1) {
        games[game_id].popped[y][x] = true;
        // adicionar ao score do jogador
        if (games[game_id].player1 == games[game_id].turn) games[game_id].p1score++;
        else games[game_id].p2score++;
        // se o score for maior que metade das bombas no jogo, vitória
        if (games[game_id].p1score >= games[game_id].mines / 2) {
            sendEvent(game_id, 'end', {
                name: games[game_id].turn,
                cells: [[x + 1, y + 1, -1]],
                winner: games[game_id].player1
            });
            increaseScore(games[game_id].player1, games[game_id].level);
            decreaseScore(games[game_id].player2, games[game_id].level);
        } else if (games[game_id].p2score >= games[game_id].mines / 2) {
            sendEvent(game_id, 'end', {
                name: games[game_id].turn,
                cells: [[x + 1, y + 1, -1]],
                winner: games[game_id].player2
            });
            increaseScore(games[game_id].player2, games[game_id].level);
            decreaseScore(games[game_id].player1, games[game_id].level);
        } else
            sendEvent(game_id, 'move', {
                name: games[game_id].turn,
                cells: [[x + 1, y + 1, -1]],
                turn: games[game_id].turn
            });
    }
    // se for uma jogada normal
    else {
        // limpar as celulas da jogada anterior
        move = [];
        // função recursiva
        expandPop(x, y, game_id);
        const p = games[game_id].turn;
        // determinar o próximo turno
        if (games[game_id].turn === games[game_id].player1) games[game_id].turn = games[game_id].player2;
        else games[game_id].turn = games[game_id].player1;
        // enviar jogada aos jogadores
        sendEvent(game_id, 'move', { name: p, cells: move, turn: games[game_id].turn });
    }
}

function expandPop(x, y, game_id) {
    games[game_id].popped[y][x] = true;
    // adicionar casa às destapadas nesta jogada
    move.push([x + 1, y + 1, games[game_id].board[y][x]]);
    let strt_i = y,
        strt_j = x,
        lm_i = y,
        lm_j = x;
    //verifica os limites da tabela
    if (x - 1 >= 0) strt_j = x - 1;
    if (x + 1 < games[game_id].boardWidth) lm_j = x + 1;
    if (y - 1 >= 0) strt_i = y - 1;
    if (y + 1 < games[game_id].boardHeight) lm_i = y + 1;
    if (games[game_id].board[y][x] === 0) {
        for (let i = strt_i; i <= lm_i; i++) {
            for (let j = strt_j; j <= lm_j; j++) {
                if (!games[game_id].popped[i][j]) {
                    expandPop(j, i, game_id);
                }
            }
        }
    }
}

function increaseScore(name, level) {
    db_con.query('SELECT * FROM Rankings WHERE name = ? && level = ?', [name, level], function(err, result) {
        if (err) console.log(err);

        if (result.length > 0) {
            db_con.query('UPDATE Rankings SET score = score + 1 WHERE name = ? && level = ?', [name, level], function(
                err,
                result
            ) {
                if (err) console.log(err);

                console.log('updated score.');
            });
        } else {
            const post = { name: name, score: 1, level: level, timestamp: Date.now() };
            db_con.query('INSERT INTO Rankings SET ?', [post], function(err, result) {
                if (err) console.log(err);
                console.log('Created new ranking');
                // resposta positiva
            });
        }
    });
}

function decreaseScore(name, level) {
    db_con.query('SELECT * FROM Rankings WHERE name = ? && level = ?', [name, level], function(err, result) {
        if (err) console.log(err);

        if (result.length > 0) {
            if (result[0].score > 0) {
                db_con.query(
                    'UPDATE Rankings SET score = score - 1 WHERE name = ? && level = ?',
                    [name, level],
                    function(err, result) {
                        if (err) console.log(err);

                        console.log('updated score.');
                    }
                );
            }
        } else {
            const post = { name: name, score: 0, level: level, timestamp: Date.now() };
            db_con.query('INSERT INTO Rankings SET ?', [post], function(err, result) {
                if (err) console.log(err);
                console.log('Created new ranking');
                // resposta positiva
            });
        }
    });
}

// função para criar hashes a partir de password e salt
function createHash(str) {
    return crypto
        .createHash('md5')
        .update(str)
        .digest('hex');
}

// função de registo/login
app.post('/register', function(request, response) {
    // extração do nome e pass do corpo do request
    const name = request.body.name;
    const pass = request.body.pass;
    //verifica se o nome obedece à regex
    if (regex.test(name)) {
        // query à base de dados
        // para descobrir se o utilizador já está registado
        db_con.query('SELECT * FROM Users WHERE name = ?', [name], function(err, result) {
            if (err) console.log(err);
            // utilizador já existe
            if (result.length > 0) {
                console.log('User exists');
                // resultado da query
                const user = result[0];
                // verificar se a password está correta
                if (createHash(pass + user.salt) == user.pass) {
                    console.log('Correct Password');
                    // resposta positiva
                    response.json({});
                }
                //password errada
                else {
                    console.log('Incorrect Password');
                    // resposta negativa
                    response.json({ error: 'Utilizador registado com senha diferente' });
                }
            }
            // utilizador nao existe
            else {
                console.log('New user');
                // gerar salt e hash
                const salt = chance.string({ length: 4 });
                const hash = createHash(pass + salt);
                // guardar na base de dados
                const post = { name: name, pass: hash, salt: salt };
                db_con.query('INSERT INTO Users SET ?', [post], function(err, result) {
                    if (err) console.log(err);
                    console.log('Created new user');
                    // resposta positiva
                    response.json({});
                });
            }
        });
    } else {
        response.json({ error: 'Nome de utilizador inválido!' });
    }
});

// Ranking
app.post('/ranking', function(request, response) {
    const level = request.body.level;
    db_con.query(
        'SELECT * FROM Rankings WHERE level = ? ORDER BY score DESC, timestamp ASC LIMIT 10;',
        [level],
        function(err, result) {
            if (err) console.log(err);
            response.json({ ranking: result });
        }
    );
});

app.post('/join', function(request, response) {
    if (regex.test(request.body.name)) {
        db_con.query('SELECT * FROM Users WHERE name = ?', [request.body.name], function(err, result) {
            if (err) console.log(err);
            // utilizador já existe
            if (result.length > 0) {
                // resultado da query
                const user = result[0];
                // verificar se a password está correta
                if (createHash(request.body.pass + user.salt) == user.pass) {
                    let game_id;
                    let key;
                    const p1 = {};
                    let p2 = {};
                    p1.name = request.body.name;
                    p1.group = request.body.group;
                    p1.level = request.body.level;
                    p1.key = createHash(chance.string({ length: 8 }));
                    key = p1.key;
                    p2 = findOpponent(p1);
                    if (p2 === undefined) {
                        game_id = gameVar++;
                        p1.game = game_id;
                        waiting_list.push(p1); //adicona p1 ao fim da fila
                        console.log(p1.name, ' joined waiting list.\n Waiting list:\n', waiting_list);
                    } else {
                        game_id = p2.game;
                        //key = p2.key;
                        startGame(p2.level, p2.game, p1.key, p2.key, p1.name, p2.name);
                        console.log(
                            'Started game: ',
                            p1.name,
                            ' vs ',
                            p2.name,
                            ' game number ',
                            game_id,
                            ' on ',
                            p2.level
                        );
                    }
                    response.json({ key: key, game: game_id });
                }
            }
        });
    } else {
        response.json({ error: 'Jogada inválida!' });
    }
});

app.post('/leave', function(request, response) {
    const name = request.body.name;
    const key = request.body.key;
    const game_id = request.body.game;
    if (regex.test(name) && testKey(name, key, game_id)) {
        let found = false;
        for (let i = 0; i < waiting_list.length; i++) {
            if (waiting_list[i].name == name) {
                found = true;
                waiting_list.splice(i, 1);
                console.log(name, ' left waiting list. \nWaiting list:\n ', waiting_list);
            }
        }
        response.json({});
    }
});

app.post('/score', function(request, response) {
    if (regex.test(request.body.name)) {
        db_con.query(
            'SELECT * FROM Rankings WHERE name = ? && level = ?',
            [request.body.name, request.body.level],
            function(err, result) {
                if (err) console.log(err);
                if (result.length > 0) response.json({ score: result[0].score });
                else response.json({ score: 0 });
            }
        );
    } else {
        response.json({ error: 'Nome de utilizador inválido!' });
    }
});

app.post('/notify', function(request, response) {
    const row = request.body.row;
    const col = request.body.col;
    const game_id = request.body.game;
    const name = request.body.name;
    const key = request.body.key;
    const cells = [];
    console.log(name, ' plays in [', row, ',', col, ']');
    //verifica a validade do nome e da chave
    if (regex.test(name) && testKey(name, key, game_id)) {
        //verifica se a jogada é válida (turno)
        if (name === games[game_id].turn) {
            //verifica os limites da tabela
            if (row > 0 && row <= games[game_id].boardHeight && (col > 0 && col <= games[game_id].boardWidth)) {
                //célula já destapada
                if (!games[game_id].popped[col - 1][row - 1]) {
                    console.log('Accepted.');
                    response.json({}); //jogada aceite
                    // rebenta casa(s)
                    clickPop(row - 1, col - 1, game_id);
                } else {
                    response.json({ error: 'Posição ' + row + ',' + col + ' já destapada' });
                }
            } else {
                response.json({ error: 'Jogada inválida!' });
            }
        } else response.json({ error: 'Não é o seu turno!' });
    } else response.json({ error: 'Erro! Não foi possivel validar a jogada' });
});

app.get('/update', function(request, response) {
    const name = request.query.name;
    const game_id = request.query.game;
    const key = request.query.key;
    if (regex.test(name) && testKey(name, key, game_id)) {
        // impedir que a conecção se feche
        request.socket.setTimeout(6000000);
        // cabecalho da resposta
        response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive'
        });
        response.write('\n');
        // adicionar às conecções abertas
        openConnections.push({ name: name, game: game_id, connection: response });
        console.log('Added player ', name, ' to connections, game ', game_id);

        if (checkGameStart(game_id)) sendEvent(game_id, 'start');

        // no caso do cliente terminar a conecção, remover da lista
        request.on('close', function() {
            for (let i = 0; i < openConnections.length; i++) {
                if (openConnections[i].name == name) {
                    openConnections.splice(i, 1);
                    break;
                }
            }
        });
    } else {
        response.json({ error: 'Erro! Não foi possivel validar o pedido' });
    }
});
