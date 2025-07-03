
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
          // Core vendor libraries
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            if (id.includes('lucide-react') || id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            if (id.includes('recharts')) {
              return 'charts-vendor';
            }
            // All other vendor libraries
            return 'vendor';
          }
          
          // Split by feature/domain
          if (id.includes('/pages/')) {
            return 'pages';
          }
          if (id.includes('/components/dashboard')) {
            return 'dashboard';
          }
          if (id.includes('/components/proposals')) {
            return 'proposals';
          }
          if (id.includes('/services/')) {
            return 'services';
          }
          if (id.includes('/hooks/')) {
            return 'hooks';
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
