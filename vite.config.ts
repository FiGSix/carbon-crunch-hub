
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHtmlPlugin } from 'vite-plugin-html';
import { visualizer } from 'rollup-plugin-visualizer';
import { componentTagger } from "lovable-tagger";
import path from 'path';

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Force development server to clear module cache
    hmr: {
      overlay: true
    },
    fs: {
      strict: false
    }
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    createHtmlPlugin({ minify: true }),
    visualizer({ open: true }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: 'terser',
    target: 'es2018',
    cssCodeSplit: true,
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 1000,
    // Enhanced tree shaking
    modulePreload: {
      polyfill: false
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Enhanced granular chunking for optimal loading
          if (id.includes('node_modules')) {
            // Split large UI libraries
            if (id.includes('@radix-ui') || id.includes('cmdk')) {
              return 'ui';
            }
            // Split React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react';
            }
            // Split data management
            if (id.includes('@tanstack') || id.includes('@supabase')) {
              return 'data';
            }
            // Split utilities and smaller libraries
            if (id.includes('date-fns') || id.includes('zod') || id.includes('clsx') || id.includes('class-variance-authority')) {
              return 'utils';
            }
            // Split animation libraries
            if (id.includes('framer-motion') || id.includes('embla-carousel')) {
              return 'animation';
            }
            // Split charts and visualization
            if (id.includes('recharts') || id.includes('lucide-react')) {
              return 'charts';
            }
            // Everything else in vendor
            return 'vendor';
          }
          
          // Split large feature chunks
          if (id.includes('/pages/') && !id.includes('Index')) {
            // Auth pages
            if (id.includes('Login') || id.includes('Register') || id.includes('Reset') || id.includes('Forgot')) {
              return 'auth-pages';
            }
            // Dashboard pages
            if (id.includes('Dashboard') || id.includes('Profile') || id.includes('Notifications')) {
              return 'dashboard-pages';
            }
            // Proposal pages
            if (id.includes('Proposal') || id.includes('Create') || id.includes('View')) {
              return 'proposal-pages';
            }
            // Admin pages
            if (id.includes('Admin') || id.includes('System') || id.includes('Agent')) {
              return 'admin-pages';
            }
          }
          
          // Split component chunks
          if (id.includes('/components/')) {
            if (id.includes('proposals/')) {
              return 'proposal-components';
            }
            if (id.includes('dashboard/')) {
              return 'dashboard-components';
            }
            if (id.includes('auth/')) {
              return 'auth-components';
            }
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
          'console.warn'
        ] : [],
        // Enhanced tree shaking
        dead_code: true,
        unused: true,
        side_effects: false,
        // Optimize conditionals and loops
        conditionals: true,
        loops: true,
        // Remove unreachable code
        passes: 3,
        // Advanced optimizations for production
        unsafe_arrows: mode === 'production',
        unsafe_methods: mode === 'production',
        unsafe_proto: mode === 'production',
        // Inline small functions
        inline: 3,
      },
      mangle: {
        safari10: true,
        properties: mode === 'production' ? {
          regex: /^_/
        } : false,
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      // Preoptimize critical UI components
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-toast',
      'clsx',
      'class-variance-authority',
      'tailwind-merge',
      // Optimize utilities
      'date-fns/format',
      'date-fns/parseISO',
      'zod',
      // Fix lodash imports
      'lodash/debounce'
    ],
    exclude: [
      'fsevents',
      // Exclude heavy libraries from pre-bundling for better chunking
      'framer-motion',
      'recharts',
      'embla-carousel-react'
    ]
  },
  // Add cache-busting for better development experience
  esbuild: {
    keepNames: true
  },
  // Force cache invalidation
  define: {
    'process.env.CACHE_BUST': `"${Date.now()}"`
  },
}));
