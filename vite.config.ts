
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
    minify: 'terser',
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Simplified chunking to prevent initialization race conditions
          if (id.includes('node_modules')) {
            // Group critical React dependencies together
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-core';
            }
            
            // Group UI libraries that work together
            if (id.includes('@radix-ui') || id.includes('lucide-react') || id.includes('class-variance-authority') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'ui-core';
            }
            
            // Backend & data fetching
            if (id.includes('@supabase') || id.includes('@tanstack/react-query')) {
              return 'data-core';
            }
            
            // Charts and heavy libraries
            if (id.includes('recharts') || id.includes('framer-motion')) {
              return 'charts-animation';
            }
            
            // All other vendor libraries in one chunk to prevent circular deps
            return 'vendor';
          }
          
          // Reduce feature splitting to avoid circular dependencies
          if (id.includes('/pages/')) {
            return 'app-pages';
          }
          
          // Keep components together
          if (id.includes('/components/') || id.includes('/hooks/') || id.includes('/services/')) {
            return 'app-core';
          }
        },
        chunkFileNames: (chunkInfo) => {
          return `js/[name]-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name!.split('.');
          const extType = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `img/[name]-[hash].[ext]`;
          }
          if (/css/i.test(extType)) {
            return `css/[name]-[hash].[ext]`;
          }
          return `assets/[name]-[hash].[ext]`;
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? [
          'console.log', 
          'console.info', 
          'console.debug', 
          'console.warn',
          'console.error'
        ] : [],
        unsafe_arrows: true,
        unsafe_methods: true,
      },
      mangle: {
        safari10: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js'
    ],
    exclude: ['fsevents']
  },
}));
