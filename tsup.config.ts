import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  outDir: 'dist',
  clean: true,
  dts: true,
  splitting: false,
  sourcemap: true,
  external: [],
  noExternal: [],
  treeshake: true,
  minify: false,
  banner: ({ format }) => {
    if (format === 'esm') {
      return {
        js: 'import { createRequire } from "module";const require=createRequire(import.meta.url);',
      };
    }
    return {};
  },
});
