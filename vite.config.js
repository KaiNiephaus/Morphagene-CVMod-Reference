import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Change to your GitHub repo name before deploying, e.g. '/morphagene-cv/'
// Use '/' if deploying to a custom domain root
const BASE_PATH = '/morphagene-cv/'

export default defineConfig({
  base: BASE_PATH,
  plugins: [react()],
})
