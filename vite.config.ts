defineConfig(({ mode }) => ({
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
