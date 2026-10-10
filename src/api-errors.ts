import type { ErrorRequestHandler, Response } from 'express';

import { invalidCredentialsMessage } from './api-schemas';

export function respondWithInvalidCredentials(response: Pick<Response, 'json'>): void {
    response.json({ error: invalidCredentialsMessage });
}

export const malformedJsonHandler: ErrorRequestHandler = (error, _request, response, next) => {
    if (
        error instanceof SyntaxError &&
        'status' in error &&
        error.status === 400 &&
        'type' in error &&
        error.type === 'entity.parse.failed'
    ) {
        response.status(400).json({ error: 'Invalid JSON request body' });
        return;
    }

    next(error);
};
