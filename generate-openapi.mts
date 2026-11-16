import { writeFile } from 'node:fs/promises';
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
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
const jsonBody = (schema: z.ZodType) => ({
    body: {
        required: true,
        content: {
            'application/json': { schema },
        },
    },
});
const errorResponseSchema = z.object({ error: z.string() });
const emptyResponseSchema = z.object({});
const jsonResponse = (schema: z.ZodType) => ({
    description: 'JSON response',
    content: { 'application/json': { schema } },
});
const requestError = { description: 'Invalid request body' };

registry.registerPath({
    method: 'post',
    path: '/register',
    summary: 'Register or authenticate a user',
    request: jsonBody(registerRequestSchema),
    responses: { 200: jsonResponse(z.union([emptyResponseSchema, errorResponseSchema])), 400: requestError },
});

registry.registerPath({
    method: 'post',
    path: '/ranking',
    summary: 'Get the top ten players for a level',
    request: jsonBody(rankingRequestSchema),
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
        ),
        400: requestError,
    },
});

registry.registerPath({
    method: 'post',
    path: '/join',
    summary: 'Join a game or wait for an opponent',
    request: jsonBody(joinRequestSchema),
    responses: {
        200: jsonResponse(z.object({ key: z.string(), game: z.number() })),
        400: requestError,
    },
});

registry.registerPath({
    method: 'post',
    path: '/leave',
    summary: 'Leave a waiting game',
    request: jsonBody(leaveRequestSchema),
    responses: { 200: jsonResponse(emptyResponseSchema), 400: requestError },
});

registry.registerPath({
    method: 'post',
    path: '/score',
    summary: 'Get a player score for a level',
    request: jsonBody(scoreRequestSchema),
    responses: {
        200: jsonResponse(z.union([z.object({ score: z.number() }), errorResponseSchema])),
        400: requestError,
    },
});

registry.registerPath({
    method: 'post',
    path: '/notify',
    summary: 'Submit a move',
    request: jsonBody(notifyRequestSchema),
    responses: {
        200: jsonResponse(z.union([emptyResponseSchema, errorResponseSchema])),
        400: requestError,
    },
});

registry.registerPath({
    method: 'get',
    path: '/update',
    summary: 'Subscribe to game updates',
    request: { query: updateQuerySchema },
    responses: {
        200: {
            description: 'Server-sent game events',
            content: { 'text/event-stream': { schema: { type: 'string' } } },
        },
        400: { description: 'Invalid query parameters' },
    },
});

const document = new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.3',
    info: {
        title: 'Minesweeper Server API',
        version: '1.0.0',
    },
});

await writeFile('openapi.json', `${JSON.stringify(document, null, 2)}\n`);
