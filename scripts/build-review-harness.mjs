// Local browser verification only. npm run build / Pages artifacts do not contain this entry.
import { build } from 'vite';
await build({
  configFile: false,
  build: {
    outDir: 'dist', emptyOutDir: false,
    lib: { entry: 'tests/browser/review-harness.ts', formats: ['es'], fileName: () => '__review-harness.js' },
  },
});
