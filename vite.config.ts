import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En local (npm run dev / preview), on sert aussi la fonction /api/fetch-page comme sur Vercel.
const localApi = () => ({
  name: 'local-api',
  configureServer(server: any) { server.middlewares.use('/api/fetch-page', async (req: any, res: any) => (await import('./api/fetch-page.js')).default(req, res)) },
  configurePreviewServer(server: any) { server.middlewares.use('/api/fetch-page', async (req: any, res: any) => (await import('./api/fetch-page.js')).default(req, res)) },
})

export default defineConfig({ plugins: [react(), localApi()] })
