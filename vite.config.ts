import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development'

  return {
    plugins: [vue(), vueDevTools()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    define: {
      'import.meta.env.VITE_N8N_WEBHOOK_URL': JSON.stringify(
        isDevelopment
          ? 'http://localhost:5678/webhook/097a91dc-38e7-43d9-b332-5d057980e055' // 测试环境 URL
          : 'https://n8n-nkzkjjyu.ap-southeast-1.clawcloudrun.com/webhook/097a91dc-38e7-43d9-b332-5d057980e055', // 生产环境 URL
      ),
      'import.meta.env.VITE_N8N_QUERY_WEBHOOK_URL': JSON.stringify(
        isDevelopment
          ? 'http://localhost:5678/webhook/9a7f35d4-d167-4018-a04b-50d0bc93a3b6' // 测试环境 URL
          : 'https://n8n-nkzkjjyu.ap-southeast-1.clawcloudrun.com/webhook/9a7f35d4-d167-4018-a04b-50d0bc93a3b6', // 生产环境 URL
      ),
    },
  }
})
