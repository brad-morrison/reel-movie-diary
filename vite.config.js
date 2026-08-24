import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'

function gitValue(args, fallback) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim()
  } catch {
    return fallback
  }
}

const buildNumber = gitValue(['rev-list', '--count', 'HEAD'], '0')
const appVersion = `v0.1.${buildNumber}`

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
})
