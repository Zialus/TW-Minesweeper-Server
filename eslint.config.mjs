import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import eslintPluginImportX from 'eslint-plugin-import-x';
import * as tsResolver from 'eslint-import-resolver-typescript';
import pluginPromise from 'eslint-plugin-promise';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import pluginSecurity from 'eslint-plugin-security';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import { defineConfig } from 'eslint/config';

export default defineConfig({
    settings: {
        'import-x/resolver': {
            name: 'tsResolver',
            resolver: tsResolver,
        },
    },
    extends: [
        eslint.configs.recommended,
        tseslint.configs.eslintRecommended,
        ...tseslint.configs.strictTypeChecked,
        ...tseslint.configs.stylisticTypeChecked,
        eslintPluginUnicorn.configs.recommended,
        sonarjs.configs.recommended,
        pluginPromise.configs['flat/recommended'],
        eslintPluginImportX.flatConfigs.recommended,
        eslintPluginImportX.flatConfigs.typescript,
        eslintPluginPrettierRecommended,
        pluginSecurity.configs.recommended,
    ],
    languageOptions: {
        globals: {
            ...globals.es2021,
            ...globals.node,
            Atomics: 'readonly',
            SharedArrayBuffer: 'readonly',
        },
        ecmaVersion: 2025,
        sourceType: 'module',
        parserOptions: {
            project: 'tsconfig.json',
        },
    },
    rules: {
        curly: 'error',
        'prefer-template': 'error',
        '@typescript-eslint/explicit-function-return-type': 'error',
        'sonarjs/prefer-enum-initializers': 'off',
    },
});
