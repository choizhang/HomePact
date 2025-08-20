import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development'

  return {
    plugins: [
      vue(),
      vueDevTools(),
      ViteImageOptimizer({
        /* pass your options here */
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    define: {
      'import.meta.env.VITE_N8N_WEBHOOK_URL': JSON.stringify(
        isDevelopment
          ? 'http://localhost:5678/webhook-test/097a91dc-38e7-43d9-b332-5d057980e055' // 测试环境 URL
          : 'https://n8n-nkzkjjyu.ap-southeast-1.clawcloudrun.com/webhook/097a91dc-38e7-43d9-b332-5d057980e055', // 生产环境 URL
      ),
      'import.meta.env.VITE_N8N_QUERY_WEBHOOK_URL': JSON.stringify(
        isDevelopment
          ? 'http://localhost:5678/webhook-test/9a7f35d4-d167-4018-a04b-50d0bc93a3b6' // 测试环境 URL
          : 'https://n8n-nkzkjjyu.ap-southeast-1.clawcloudrun.com/webhook/9a7f35d4-d167-4018-a04b-50d0bc93a3b6', // 生产环境 URL
      ),
      'import.meta.env.VITE_N8N_GENERATE_COVER_WEBHOOK_URL': JSON.stringify(
        isDevelopment
          ? 'http://localhost:5678/webhook-test/a41d932a-c983-416b-ad0d-4d264e51901b' // 测试环境 URL，请替换为实际 ID
          : 'https://n8n-nkzkjjyu.ap-southeast-1.clawcloudrun.com/webhook/a41d932a-c983-416b-ad0d-4d264e51901b', // 生产环境 URL，请替换为实际 ID
      ),
    },
  }
})
