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

    it.each([
        { status: 400, type: 'entity.parse.failed', message: 'Invalid JSON request body' },
        { status: 400, type: 'request.aborted', message: 'Invalid request body' },
        { status: 403, type: 'entity.verify.failed', message: 'Invalid request body' },
        { status: 413, type: 'entity.too.large', message: 'Invalid request body' },
        { status: 415, type: 'encoding.unsupported', message: 'Invalid request body' },
    ])('returns a JSON $status response for $type', ({ status, type, message }) => {
        const response = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        const next = vi.fn();
        const error = Object.assign(new Error('Request parsing failed'), { status, type });

        malformedJsonHandler(error, {} as Request, response as unknown as Response, next as NextFunction);

        expect(response.status).toHaveBeenCalledWith(status);
        expect(response.json).toHaveBeenCalledWith({ error: message });
        expect(next).not.toHaveBeenCalled();
    });

    it.each([
        { description: 'plain errors', error: new Error('Unexpected failure') },
        { description: 'null errors', error: null },
        { description: 'errors without a status', error: { type: 'entity.parse.failed' } },
        { description: 'server errors', error: { status: 500, type: 'entity.too.large' } },
        { description: 'unrecognized parser errors', error: { status: 400, type: 'application.error' } },
    ])('passes $description to Express', ({ error }) => {
        const next = vi.fn();

        malformedJsonHandler(error, {} as Request, {} as Response, next as NextFunction);

        expect(next).toHaveBeenCalledWith(error);
    });
});
