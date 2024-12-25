import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import importPlugin from 'eslint-plugin-import';
import pluginPromise from 'eslint-plugin-promise';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import pluginSecurity from 'eslint-plugin-security';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

/** @type {import('@typescript-eslint/utils').TSESLint.FlatConfig.ConfigFile} */
export default tseslint.config({
    extends: [
        eslint.configs.recommended,
        tseslint.configs.eslintRecommended,
        tseslint.configs.strictTypeChecked,
        tseslint.configs.stylisticTypeChecked,
        eslintPluginUnicorn.configs['flat/recommended'],
        sonarjs.configs.recommended,
        pluginPromise.configs['flat/recommended'],
        importPlugin.flatConfigs.recommended,
        importPlugin.flatConfigs.typescript,
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
