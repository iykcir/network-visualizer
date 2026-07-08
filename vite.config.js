import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const membershipUrl = env.MEMBERSHIP_URL || 'http://localhost:3000'

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Proxies /membership-api/* → membershipUrl/* to avoid CORS in dev.
        // Set MEMBERSHIP_URL in .env.local to point at the right server.
        '/membership-api': {
          target: membershipUrl,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/membership-api/, ''),
        },
      },
    },
  }
})
