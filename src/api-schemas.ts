import { z } from 'zod';

const playerNameSchema = z.string().min(1);

export const invalidCredentialsMessage = 'Credenciais inválidas';

export const registerRequestSchema = z.object({
    name: playerNameSchema,
    pass: z.string(),
});

export const rankingRequestSchema = z.object({
    level: z.string().min(1),
});

export const joinRequestSchema = z.object({
    name: playerNameSchema,
    pass: z.string(),
    group: z.number().int().nonnegative(),
    level: z.string().min(1),
});

export const playerCredentialsSchema = z.object({
    game: z.number().int().nonnegative(),
    name: playerNameSchema,
    key: z.string().min(1),
});

export const scoreRequestSchema = z.object({
    name: playerNameSchema,
    level: z.string().min(1),
});

export const notifyRequestSchema = playerCredentialsSchema.extend({
    row: z.number().int().nonnegative(),
    col: z.number().int().nonnegative(),
});

export const updateRequestSchema = z.object({
    game: z.string().min(1),
    name: playerNameSchema,
    key: z.string().min(1),
});

export const apiOperations = {
    register: {
        path: '/register',
        method: 'post',
        operationId: 'register',
        summary: 'Register a user or log in an existing user',
        description: 'Creates a user when the name is new. For an existing user, validates the password.',
        requestDescription: 'User name and password.',
        tag: 'Users',
        requestSource: 'body',
        requestSchemaName: 'RegisterRequest',
        requestSchema: registerRequestSchema,
        rateLimited: true,
    },
    ranking: {
        path: '/ranking',
        method: 'post',
        operationId: 'getRanking',
        summary: 'Get the top ten rankings for a level',
        description: 'Returns the top ten rankings for the requested difficulty level.',
        requestDescription: 'Difficulty level for which to retrieve rankings.',
        tag: 'Rankings',
        requestSource: 'body',
        requestSchemaName: 'RankingRequest',
        requestSchema: rankingRequestSchema,
        rateLimited: true,
    },
    join: {
        path: '/join',
        method: 'post',
        operationId: 'joinGame',
        summary: 'Join the waiting queue for a game',
        description: 'Returns a game identifier and player key when the credentials are valid.',
        requestDescription: 'User credentials and desired game settings.',
        tag: 'Games',
        requestSource: 'body',
        requestSchemaName: 'JoinRequest',
        requestSchema: joinRequestSchema,
        rateLimited: true,
    },
    leave: {
        path: '/leave',
        method: 'post',
        operationId: 'leaveQueue',
        summary: 'Leave the waiting queue',
        description: 'Removes a player from the waiting queue when the game credentials are valid.',
        requestDescription: 'Game identifier and player credentials.',
        tag: 'Games',
        requestSource: 'body',
        requestSchemaName: 'PlayerCredentials',
        requestSchema: playerCredentialsSchema,
        rateLimited: false,
    },
    score: {
        path: '/score',
        method: 'post',
        operationId: 'getScore',
        summary: "Get a player's score for a level",
        description: 'Returns the player score for the requested difficulty level.',
        requestDescription: 'Player name and difficulty level.',
        tag: 'Rankings',
        requestSource: 'body',
        requestSchemaName: 'ScoreRequest',
        requestSchema: scoreRequestSchema,
        rateLimited: true,
    },
    notify: {
        path: '/notify',
        method: 'post',
        operationId: 'notifyMove',
        summary: 'Submit a move in a game',
        description: 'Submits a one-based row and column position for the current game.',
        requestDescription: 'Game credentials and the row and column of the move.',
        tag: 'Games',
        requestSource: 'body',
        requestSchemaName: 'NotifyRequest',
        requestSchema: notifyRequestSchema,
        rateLimited: true,
    },
    update: {
        path: '/update',
        method: 'get',
        operationId: 'subscribeToGame',
        summary: 'Subscribe to game updates',
        description:
            'Streams JSON game-start, move, and end events via SSE; invalid credentials return a JSON error with HTTP 200.',
        tag: 'Games',
        requestSource: 'query',
        requestSchemaName: 'UpdateRequest',
        requestSchema: updateRequestSchema,
        rateLimited: false,
    },
} as const;
