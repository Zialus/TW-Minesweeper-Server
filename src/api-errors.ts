import type { ErrorRequestHandler, Response } from 'express';

import { invalidCredentialsMessage } from './api-schemas';

const bodyParserClientErrorTypes = new Set([
    'entity.parse.failed',
    'entity.verify.failed',
    'request.aborted',
    'request.size.invalid',
    'entity.too.large',
    'encoding.unsupported',
    'charset.unsupported',
]);

export function respondWithInvalidCredentials(response: Pick<Response, 'json'>): void {
    response.json({ error: invalidCredentialsMessage });
}

function getBodyParserClientError(error: unknown): { status: number; type: string } | undefined {
    if (typeof error !== 'object' || error === null || !('status' in error) || !('type' in error)) {
        return undefined;
    }

    const { status, type } = error;
    if (
        typeof status !== 'number' ||
        status < 400 ||
        status >= 500 ||
        typeof type !== 'string' ||
        !bodyParserClientErrorTypes.has(type)
    ) {
        return undefined;
    }

    return { status, type };
}

export const malformedJsonHandler: ErrorRequestHandler = (error, _request, response, next) => {
    const parserError = getBodyParserClientError(error);
    if (parserError !== undefined) {
        response.status(parserError.status).json({
            error: parserError.type === 'entity.parse.failed' ? 'Invalid JSON request body' : 'Invalid request body',
        });
        return;
    }

    next(error);
};
