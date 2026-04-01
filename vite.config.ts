import { defineConfig } from "vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  // 1. THIS IS THE MAGIC LINE: Tell Vite where the HTML lives
  root: "src", 
  
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1420 } : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  // 2. Tell Vite to put the compiled code back in the main folder
  build: {
    outDir: "../dist", 
    emptyOutDir: true,
  }
}));