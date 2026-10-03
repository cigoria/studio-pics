import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.PORT) || 5173
  const serverPort = Number(env.SERVER_PORT) || 3000

  return {
    plugins: [vue()],
    server: {
      port,
      proxy: {
        '/api': `http://localhost:${serverPort}`,
        '/uploads': `http://localhost:${serverPort}`
      }
    }
  }
})
