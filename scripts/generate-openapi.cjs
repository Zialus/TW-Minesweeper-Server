const { existsSync, statSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { toJSONSchema } = require('zod');
const compiledApiSchemasPath = resolve(__dirname, '../dist/api-schemas.js');
const sourceApiSchemasPath = resolve(__dirname, '../src/api-schemas.ts');

if (
    !existsSync(compiledApiSchemasPath) ||
    statSync(sourceApiSchemasPath).mtimeMs > statSync(compiledApiSchemasPath).mtimeMs
) {
    throw new Error('API schemas are not built or are out of date; run `pnpm run build` before generation.');
}

const {
    apiOperations,
    invalidCredentialsMessage,
    joinRequestSchema,
    notifyRequestSchema,
    playerCredentialsSchema,
    rankingRequestSchema,
    registerRequestSchema,
    scoreRequestSchema,
    updateRequestSchema,
} = require(compiledApiSchemasPath);

const requestSchemas = {
    RegisterRequest: registerRequestSchema,
    RankingRequest: rankingRequestSchema,
    JoinRequest: joinRequestSchema,
    PlayerCredentials: playerCredentialsSchema,
    ScoreRequest: scoreRequestSchema,
    NotifyRequest: notifyRequestSchema,
    UpdateRequest: updateRequestSchema,
};

const errorResult = { $ref: '#/components/schemas/ErrorResult' };
const emptyResult = { $ref: '#/components/schemas/EmptyResult' };
const badRequestResponse = { $ref: '#/components/responses/BadRequest' };
const rateLimitResponse = { $ref: '#/components/responses/TooManyRequests' };

const requestExamples = {
    register: {
        existingUser: {
            summary: 'Log in as the CI test player',
            value: {
                name: 'schemathesis-player',
                pass: 'schemathesis-password',
            },
        },
    },
    ranking: {
        beginner: {
            summary: 'Get beginner rankings',
            value: { level: 'beginner' },
        },
    },
    join: {
        waitingPlayer: {
            summary: 'Join the queue as the CI test player',
            value: {
                name: 'schemathesis-player',
                pass: 'schemathesis-password',
                group: 0,
                level: 'beginner',
            },
        },
    },
    leave: {
        unknownPlayer: {
            summary: 'Credentials for a player who is not in a game',
            value: {
                game: 0,
                name: 'unknown-player',
                key: 'unknown-key',
            },
        },
    },
    score: {
        beginner: {
            summary: 'Get beginner score for the CI test player',
            value: {
                name: 'schemathesis-player',
                level: 'beginner',
            },
        },
    },
    notify: {
        invalidPlayer: {
            summary: 'Submit a move with unknown player credentials',
            value: {
                game: 0,
                name: 'unknown-player',
                key: 'unknown-key',
                row: 1,
                col: 1,
            },
        },
    },
};

const queryExamples = {
    update: {
        game: '0',
        name: 'unknown-player',
        key: 'unknown-key',
    },
};

const rankingEntry = { name: 'schemathesis-player', level: 'beginner', score: 42, timestamp: 1700000000000 };

const propertyExamples = {
    name: 'schemathesis-player',
    pass: 'schemathesis-password',
    level: 'beginner',
    group: 0,
    game: 0,
    key: 'unknown-key',
    row: 1,
    col: 1,
    error: 'Utilizador registado com senha diferente',
};

const responses = {
    register: {
        200: {
            description: 'Registration or login result',
            content: {
                'application/json': {
                    schema: { $ref: '#/components/schemas/Result' },
                    examples: {
                        success: { value: {} },
                        failure: { value: { error: 'Utilizador registado com senha diferente' } },
                    },
                },
            },
        },
    },
    ranking: {
        200: {
            description: 'Rankings ordered by score and timestamp',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        required: ['ranking'],
                        properties: {
                            ranking: {
                                type: 'array',
                                maxItems: 10,
                                items: { $ref: '#/components/schemas/Ranking' },
                                example: [rankingEntry],
                            },
                        },
                        example: { ranking: [rankingEntry] },
                    },
                    examples: { topPlayers: { value: { ranking: [rankingEntry] } } },
                },
            },
        },
    },
    join: {
        200: {
            description: 'Game and player credentials, or an application-level error',
            content: {
                'application/json': {
                    schema: {
                        oneOf: [
                            {
                                type: 'object',
                                required: ['key', 'game'],
                                properties: {
                                    key: { type: 'string', example: 'player-key' },
                                    game: { type: 'integer', minimum: 0, example: 0 },
                                },
                            },
                            errorResult,
                        ],
                    },
                    examples: {
                        joined: { value: { key: 'player-key', game: 0 } },
                        invalidCredentials: { value: { error: invalidCredentialsMessage } },
                    },
                },
            },
        },
    },
    leave: {
        200: {
            description: 'Request accepted, or an application-level error',
            content: {
                'application/json': {
                    schema: { oneOf: [emptyResult, errorResult] },
                    examples: {
                        accepted: { value: {} },
                        invalidCredentials: { value: { error: invalidCredentialsMessage } },
                    },
                },
            },
        },
    },
    score: {
        200: {
            description: 'Player score or an application-level error',
            content: {
                'application/json': {
                    schema: {
                        oneOf: [
                            {
                                type: 'object',
                                required: ['score'],
                                properties: { score: { type: 'integer', minimum: 0 } },
                            },
                            errorResult,
                        ],
                    },
                    examples: {
                        score: { value: { score: 42 } },
                        failure: { value: { error: 'Utilizador inexistente' } },
                    },
                },
            },
        },
    },
    notify: {
        200: {
            description: 'Move accepted, or an application-level error',
            content: {
                'application/json': {
                    schema: { oneOf: [emptyResult, errorResult] },
                    examples: {
                        success: { value: {} },
                        failure: { value: { error: 'Jogador inexistente' } },
                    },
                },
            },
        },
    },
    update: {
        200: {
            description: 'Server-sent game events, or a JSON application-level error',
            content: {
                'text/event-stream': {
                    schema: {
                        type: 'string',
                        description: 'Each data event contains a JSON game-start, move, or end payload.',
                    },
                    examples: {
                        start: {
                            value: 'data: {"opponent":"player2","turn":"player1"}\n\n',
                        },
                        move: {
                            value: 'data: {"move":{"name":"player1","cells":[[1,1,0]]},"turn":"player2"}\n\n',
                        },
                        end: {
                            value: 'data: {"move":{"name":"player1","cells":[[1,1,-1]]},"winner":"player1"}\n\n',
                        },
                    },
                },
                'application/json': {
                    schema: errorResult,
                    examples: { failure: { value: { error: 'Jogo inexistente' } } },
                },
            },
        },
    },
};

function toYamlScalar(value) {
    if (typeof value === 'string') {
        return JSON.stringify(value);
    }

    return String(value);
}

function toYamlKey(key) {
    return /^[A-Za-z_-][A-Za-z0-9_-]*$/.test(key) ? key : JSON.stringify(key);
}

function toYaml(value, indentation = 0) {
    const indent = ' '.repeat(indentation);

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return `${indent}[]`;
        }

        return value
            .map((item) => {
                if (item !== null && typeof item === 'object') {
                    return `${indent}-\n${toYaml(item, indentation + 2)}`;
                }

                return `${indent}- ${toYamlScalar(item)}`;
            })
            .join('\n');
    }

    if (value !== null && typeof value === 'object') {
        const entries = Object.entries(value);
        if (entries.length === 0) {
            return `${indent}{}`;
        }

        return entries
            .map(([key, item]) => {
                const yamlKey = toYamlKey(key);
                if (item !== null && typeof item === 'object') {
                    if (Array.isArray(item) && item.length === 0) {
                        return `${indent}${yamlKey}: []`;
                    }
                    if (!Array.isArray(item) && Object.keys(item).length === 0) {
                        return `${indent}${yamlKey}: {}`;
                    }
                    return `${indent}${yamlKey}:\n${toYaml(item, indentation + 2)}`;
                }

                return `${indent}${yamlKey}: ${toYamlScalar(item)}`;
            })
            .join('\n');
    }

    return `${indent}${toYamlScalar(value)}`;
}

const schemas = Object.fromEntries(
    Object.entries(requestSchemas).map(([name, schema]) => {
        const jsonSchema = toJSONSchema(schema);
        delete jsonSchema.$schema;
        // Zod strips unknown request keys, so the JSON Schema should not reject them.
        delete jsonSchema.additionalProperties;
        return [name, jsonSchema];
    }),
);

const schemaDescriptions = {
    RegisterRequest: 'User name and password used to register or log in.',
    RankingRequest: 'Request for rankings at a difficulty level.',
    JoinRequest: 'User credentials and game settings used to join matchmaking.',
    PlayerCredentials: 'Credentials identifying a player in a game.',
    ScoreRequest: 'Player name and difficulty level for a score lookup.',
    NotifyRequest: 'Player credentials and board position for a move.',
    EmptyResult: 'Empty JSON object returned when an operation succeeds without additional data.',
    Result: 'Successful empty result or an application-level error.',
    ErrorResult: 'Application-level error message.',
    Ranking: 'A player score and its ranking level and timestamp.',
};

schemas.EmptyResult = { type: 'object', additionalProperties: false };
schemas.Result = { oneOf: [emptyResult, errorResult] };
schemas.ErrorResult = {
    type: 'object',
    required: ['error'],
    properties: { error: { type: 'string' } },
};
schemas.Ranking = {
    type: 'object',
    required: ['name', 'level', 'score', 'timestamp'],
    properties: {
        name: { type: 'string' },
        level: { type: 'string', enum: ['beginner', 'intermediate', 'expert'] },
        score: { type: 'integer' },
        timestamp: { type: 'integer', format: 'int64' },
    },
};
for (const name of [...Object.keys(requestSchemas), 'ErrorResult']) {
    for (const [property, schema] of Object.entries(schemas[name].properties)) {
        schema.example = name === 'UpdateRequest' ? queryExamples.update[property] : propertyExamples[property];
    }
}
schemas.RegisterRequest.example = requestExamples.register.existingUser.value;
for (const [name, description] of Object.entries(schemaDescriptions)) {
    schemas[name].description = description;
}

for (const name of Object.keys(apiOperations)) {
    if (!responses[name]?.['200']) {
        throw new Error(`Missing success response definition for API operation: ${name}`);
    }
}

const paths = {};
for (const [name, operation] of Object.entries(apiOperations)) {
    const pathItem = (paths[operation.path] ??= {});
    const parameters =
        operation.requestSource === 'query'
            ? Object.entries(schemas[operation.requestSchemaName].properties).map(([parameterName, schema]) => ({
                  name: parameterName,
                  in: 'query',
                  required: schemas[operation.requestSchemaName].required.includes(parameterName),
                  description: {
                      game: 'Game identifier.',
                      name: 'Player name.',
                      key: 'Player key.',
                  }[parameterName],
                  ...(queryExamples[name] === undefined ? {} : { example: queryExamples[name][parameterName] }),
                  schema,
              }))
            : undefined;

    pathItem[operation.method] = {
        operationId: operation.operationId,
        summary: operation.summary,
        description: operation.description,
        tags: [operation.tag],
        ...(parameters === undefined
            ? {
                  requestBody: {
                      required: true,
                      description: operation.requestDescription,
                      content: {
                          'application/json': {
                              schema: { $ref: `#/components/schemas/${operation.requestSchemaName}` },
                              ...(requestExamples[name] === undefined ? {} : { examples: requestExamples[name] }),
                          },
                      },
                  },
              }
            : { parameters }),
        responses: {
            ...responses[name],
            400: badRequestResponse,
            ...(operation.rateLimited ? { 429: rateLimitResponse } : {}),
        },
    };
}

const document = {
    openapi: '3.1.0',
    info: {
        title: 'TW Minesweeper Server API',
        version: '1.0.0',
        description: 'HTTP and server-sent event API implemented by the Minesweeper server.',
    },
    tags: [
        { name: 'Games', description: 'Game and matchmaking operations.' },
        { name: 'Rankings', description: 'Player rankings and scores.' },
        { name: 'Users', description: 'User registration and authentication.' },
    ],
    servers: [{ url: '/' }],
    paths,
    components: {
        responses: {
            BadRequest: {
                description: 'Request data failed validation',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            description: 'Zod validation error',
                            additionalProperties: true,
                            example: { error: 'Invalid request body' },
                        },
                        examples: { validationError: { value: { error: 'Invalid request body' } } },
                    },
                },
            },
            TooManyRequests: {
                description: 'Rate limit exceeded',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['message'],
                            properties: {
                                message: {
                                    type: 'string',
                                    example: 'Too many requests, please try again later.',
                                },
                            },
                        },
                    },
                },
            },
        },
        schemas: Object.fromEntries(Object.entries(schemas).filter(([name]) => name !== 'UpdateRequest')),
    },
};

writeFileSync(resolve(__dirname, '../docs/openapi.yaml'), `${toYaml(document)}\n`);
