import { defineConfig } from 'vitest/config';

export default defineConfig({
    tsconfig: './tsconfig.tests.json',
    test: {
        include: ['tests/**/*.test.ts'],
        coverage: {
            reportsDirectory: './dist/coverage',
            thresholds: {
                statements: 80,
                branches: 80,
                functions: 80,
                lines: 80,
            },
        },
    },
});
