
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const componentTagger = () => {
  return {
    name: 'component-tagger',
    transform(code: string, id: string) {
      if (id.endsWith('.tsx') && !id.includes('node_modules')) {
        return code;
      }
    }
  };
};

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        pure_funcs: [
          'console.log', 
          'console.info', 
          'console.debug', 
          'console.warn',
          'console.error'
        ],
      },
    },
  },
}));
