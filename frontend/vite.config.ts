import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasm(),
    tsconfigPaths(),
  ],

  // Handle JSX in .js files (CRA migration compatibility)
  // Note: .tsx files are handled automatically by @vitejs/plugin-react
  esbuild: {
    jsx: 'automatic',
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // WASM and Worker support
  worker: {
    format: 'es',
    plugins: () => [wasm()],
  },

  // Optimize dependencies
  optimizeDeps: {
    exclude: ['@anthropic-ai/sdk'],
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.ts': 'tsx',
        '.tsx': 'tsx',
      },
    },
  },

  // Build configuration for production
  build: {
    target: 'esnext',
    // Enable proper WASM handling
    rollupOptions: {
      output: {
        // Ensure WASM files are properly handled
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.wasm')) {
            return 'assets/wasm/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },

  // Server configuration
  server: {
    port: 3000,
    // Required headers for SharedArrayBuffer (used by some WASM operations)
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  // Preview server (for production builds)
  preview: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
