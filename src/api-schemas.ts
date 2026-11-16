import { z } from 'zod';

export const registerRequestSchema = z.object({
    name: z.string().min(1),
    pass: z.string(),
});

export const rankingRequestSchema = z.object({
    level: z.string().min(1),
});

export const joinRequestSchema = z.object({
    name: z.string().min(1),
    pass: z.string(),
    group: z.number().nonnegative(),
    level: z.string().min(1),
});

export const leaveRequestSchema = z.object({
    game: z.number().nonnegative(),
    name: z.string().min(1),
    key: z.string().min(1),
});

export const scoreRequestSchema = z.object({
    name: z.string().min(1),
    level: z.string().min(1),
});

export const notifyRequestSchema = z.object({
    row: z.number().nonnegative(),
    col: z.number().nonnegative(),
    game: z.number().nonnegative(),
    name: z.string().min(1),
    key: z.string().min(1),
});

export const updateQuerySchema = z.object({
    game: z.string().min(1),
    name: z.string().min(1),
    key: z.string().min(1),
});
