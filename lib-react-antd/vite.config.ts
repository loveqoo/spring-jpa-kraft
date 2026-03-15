import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import dts from 'vite-plugin-dts'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))
const deps = Object.keys(pkg.dependencies ?? {})
const peerDeps = Object.keys(pkg.peerDependencies ?? {})
const external = [...deps, ...peerDeps]

export default defineConfig({
  plugins: [dts({ tsconfigPath: './tsconfig.json' })],
  test: {
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: (id) => external.some((dep) => id === dep || id.startsWith(`${dep}/`)),
    },
  },
})
