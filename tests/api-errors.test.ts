import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { invalidCredentialsMessage } from '../src/api-schemas';
import { malformedJsonHandler, respondWithInvalidCredentials } from '../src/api-errors';

describe('API error responses', () => {
    it('returns the shared invalid-credentials message', () => {
        const response = { json: vi.fn() };

        respondWithInvalidCredentials(response);

        expect(response.json).toHaveBeenCalledWith({ error: invalidCredentialsMessage });
    });

    it('returns a JSON 400 response for malformed JSON', () => {
        const response = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        const next = vi.fn();
        const error = Object.assign(new SyntaxError('Invalid JSON'), { status: 400, type: 'entity.parse.failed' });

        malformedJsonHandler(error, {} as Request, response as unknown as Response, next as NextFunction);

        expect(response.status).toHaveBeenCalledWith(400);
        expect(response.json).toHaveBeenCalledWith({ error: 'Invalid JSON request body' });
        expect(next).not.toHaveBeenCalled();
    });

    it('passes unrelated errors to Express', () => {
        const error = Object.assign(new SyntaxError('Unexpected failure'), {
            status: 400,
            type: 'request.aborted',
        });
        const next = vi.fn();

        malformedJsonHandler(error, {} as Request, {} as Response, next as NextFunction);

        expect(next).toHaveBeenCalledWith(error);
    });
});
