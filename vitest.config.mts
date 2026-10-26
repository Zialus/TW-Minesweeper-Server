import codspeedPlugin from '@codspeed/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [codspeedPlugin()],
    tsconfig: './tsconfig.tests.json',
    test: {
        include: ['tests/**/*.test.ts'],
        benchmark: {
            include: ['tests/**/*.bench.ts'],
        },
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
