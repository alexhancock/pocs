import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite runs in middleware mode inside server.ts, so this config is intentionally
// minimal. It only wires up React fast-refresh and the JSX transform.
export default defineConfig({
  plugins: [react()],
});
