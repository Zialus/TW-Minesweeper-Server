import { writeFile } from 'node:fs/promises';
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { format, resolveConfig } from 'prettier';
import { z } from 'zod';
import {
    joinRequestSchema,
    leaveRequestSchema,
    notifyRequestSchema,
    rankingRequestSchema,
    registerRequestSchema,
    scoreRequestSchema,
    updateQuerySchema,
} from './src/api-schemas.ts';

const registry = new OpenAPIRegistry();
const jsonBody = (schema: z.ZodType, description: string, example: object) => ({
    body: {
        required: true,
        description,
        content: {
            'application/json': { schema, example },
        },
    },
});
const errorResponseSchema = z.object({ error: z.string() });
const emptyResponseSchema = z.object({});
const jsonResponse = (schema: z.ZodType, description: string, example: object) => ({
    description,
    content: { 'application/json': { schema, example } },
});

registry.registerPath({
    method: 'post',
    path: '/register',
    summary: 'Register or authenticate a user',
    description: 'Register a new user or authenticate an existing user.',
    operationId: 'registerUser',
    tags: ['Authentication'],
    request: jsonBody(registerRequestSchema, 'User credentials.', { name: 'player1', pass: 'example-password' }),
    responses: {
        200: jsonResponse(
            z.union([emptyResponseSchema, errorResponseSchema]),
            'The registration or authentication result.',
            {},
        ),
        400: { description: 'The request body did not match the expected credentials.' },
    },
});

registry.registerPath({
    method: 'post',
    path: '/ranking',
    summary: 'Get the top ten players for a level',
    description: 'Retrieve the ten highest-ranked players for the requested level.',
    operationId: 'getRanking',
    tags: ['Rankings'],
    request: jsonBody(rankingRequestSchema, 'The level to retrieve rankings for.', { level: 'beginner' }),
    responses: {
        200: jsonResponse(
            z.object({
                ranking: z.array(
                    z.object({
                        name: z.string(),
                        level: z.string(),
                        score: z.number(),
                        timestamp: z.number(),
                    }),
                ),
            }),
            'The ordered ranking entries for the requested level.',
            { ranking: [{ name: 'player1', level: 'beginner', score: 3, timestamp: 1_700_000_000_000 }] },
        ),
        400: { description: 'The request body did not include a valid level.' },
    },
});

registry.registerPath({
    method: 'post',
    path: '/join',
    summary: 'Join a game or wait for an opponent',
    description: 'Join the waiting list or start a game with a matching opponent.',
    operationId: 'joinGame',
    tags: ['Games'],
    request: jsonBody(joinRequestSchema, 'Credentials and game preferences.', {
        name: 'player1',
        pass: 'example-password',
        group: 1,
        level: 'beginner',
    }),
    responses: {
        200: jsonResponse(
            z.object({
                key: z.string(),
                game: z.number(),
            }),
            'The game identifier and player key.',
            { key: 'example-key', game: 1 },
        ),
        400: { description: 'The request body did not match the expected player and game details.' },
    },
});

registry.registerPath({
    method: 'post',
    path: '/leave',
    summary: 'Leave a waiting game',
    description: 'Remove a player from the waiting list when the supplied credentials are valid.',
    operationId: 'leaveGame',
    tags: ['Games'],
    request: jsonBody(leaveRequestSchema, 'The player and game credentials.', {
        game: 1,
        name: 'player1',
        key: 'example-key',
    }),
    responses: {
        200: jsonResponse(emptyResponseSchema, 'The player left the waiting list.', {}),
        400: { description: 'The request body did not match the expected player and game details.' },
    },
});

registry.registerPath({
    method: 'post',
    path: '/score',
    summary: 'Get a player score for a level',
    description: 'Retrieve a player score for the requested level.',
    operationId: 'getPlayerScore',
    tags: ['Rankings'],
    request: jsonBody(scoreRequestSchema, 'The player and level to look up.', { name: 'player1', level: 'beginner' }),
    responses: {
        200: jsonResponse(
            z.union([z.object({ score: z.number() }), errorResponseSchema]),
            'The player score or a validation error.',
            { score: 3 },
        ),
        400: { description: 'The request body did not match the expected player and level.' },
    },
});

registry.registerPath({
    method: 'post',
    path: '/notify',
    summary: 'Submit a move',
    description: 'Submit a move for the current player in a game.',
    operationId: 'submitMove',
    tags: ['Games'],
    request: jsonBody(notifyRequestSchema, 'The move coordinates and player credentials.', {
        row: 1,
        col: 1,
        game: 1,
        name: 'player1',
        key: 'example-key',
    }),
    responses: {
        200: jsonResponse(z.union([emptyResponseSchema, errorResponseSchema]), 'The move result.', {}),
        400: { description: 'The request body did not match the expected move details.' },
    },
});

registry.registerPath({
    method: 'get',
    path: '/update',
    summary: 'Subscribe to game updates',
    description: 'Open a server-sent events connection for updates from a game.',
    operationId: 'subscribeToGameUpdates',
    tags: ['Game updates'],
    request: { query: updateQuerySchema },
    responses: {
        200: {
            description: 'Server-sent game events',
            content: { 'text/event-stream': { schema: { type: 'string' } } },
        },
        400: { description: 'The query parameters did not match the expected game and player credentials.' },
    },
});

const document = new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.3',
    info: {
        title: 'Minesweeper Server API',
        version: '1.0.0',
        description: 'HTTP API for user authentication, Minesweeper games, scores, and game updates.',
    },
    servers: [{ url: 'http://localhost:9876', description: 'Default local server' }],
    tags: [
        { name: 'Authentication', description: 'User registration and authentication.' },
        { name: 'Rankings', description: 'Player ranking and score lookups.' },
        { name: 'Games', description: 'Game participation and moves.' },
        { name: 'Game updates', description: 'Server-sent game event streams.' },
    ],
});

const formattedDocument = await format(JSON.stringify(document), {
    ...(await resolveConfig('openapi.json')),
    parser: 'json',
});

await writeFile('openapi.json', formattedDocument);
