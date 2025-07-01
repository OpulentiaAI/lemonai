import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers';
import path from 'path';
import svgLoader from 'vite-svg-loader';

// Web deployment configuration
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    root: __dirname,
    base: '/',
    build: {
      outDir: 'dist', // Standard web output directory
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router', 'pinia'],
            'ant-design': ['ant-design-vue'],
            'markdown': ['marked', 'markdown-it'],
            'mermaid': ['mermaid'],
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    plugins: [
      vue(),
      svgLoader(),
      Components({
        resolvers: [
          AntDesignVueResolver({
            importStyle: 'less',
          }),
        ],
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '~@': path.resolve(__dirname, 'src'),
        'path': 'path-browserify', // Fix for browser compatibility
        '@/utils/http.js': path.resolve(__dirname, 'src/utils/http-cloud.js'), // Use cloud http in production
        '@/services/platforms.js': path.resolve(__dirname, 'src/services/platforms-cloud.js'), // Use cloud platforms service
        '@/services/default-model-setting.js': path.resolve(__dirname, 'src/services/default-model-setting-cloud.js') // Use cloud model settings
      },
    },
    define: {
      'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || ''),
      'process.env.VITE_CLOUD_MODE': JSON.stringify(process.env.VITE_CLOUD_MODE || 'true'),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
    },
    server: {
      port: env.VITE_PORT || 5173,
      host: '0.0.0.0',
      strictPort: true,
      proxy: {
        '/api': {
          target: env.VITE_SERVICE_URL || 'http://127.0.0.1:3000',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});