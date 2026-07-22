import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js',
                'resources/css/member-panel.css',
                'resources/js/member-panel/main.tsx',
            ],
            refresh: true,
            publicDirectory: '../',
            buildDirectory: 'assets/build',
        }),
        react(),
    ],
    resolve: {
        alias: {
            '@': path.resolve('resources/js/member-panel'),
        },
    },
    build: {
        emptyOutDir: true,
    },
});
