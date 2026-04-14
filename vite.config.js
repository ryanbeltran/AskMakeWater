import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'

let commitSha = 'dev'
try {
  commitSha = execSync('git rev-parse --short HEAD').toString().trim()
} catch {
  commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev'
}

export default defineConfig({
  define: {
    __APP_COMMIT__: JSON.stringify(commitSha),
  },
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
