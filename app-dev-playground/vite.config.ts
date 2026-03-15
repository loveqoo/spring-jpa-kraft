import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'lib-entity-support': path.resolve(__dirname, '../lib-entity-support/src/index.ts'),
      'lib-react-antd': path.resolve(__dirname, '../lib-react-antd/src/index.ts'),
    },
  },
})
