import { z } from 'zod';

const playerNameSchema = z.string().min(1).meta({ pattern: '^[\\w-]+$' });

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
    group: z.number().nonnegative(),
    level: z.string().min(1),
});

export const playerCredentialsSchema = z.object({
    game: z.number().nonnegative(),
    name: playerNameSchema,
    key: z.string().min(1),
});

export const scoreRequestSchema = z.object({
    name: playerNameSchema,
    level: z.string().min(1),
});

export const notifyRequestSchema = playerCredentialsSchema.extend({
    row: z.number().nonnegative().meta({ minimum: 1 }),
    col: z.number().nonnegative().meta({ minimum: 1 }),
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
        requestSource: 'query',
        requestSchemaName: 'UpdateRequest',
        requestSchema: updateRequestSchema,
        rateLimited: false,
    },
} as const;
