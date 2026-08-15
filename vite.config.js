import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // A porta da API vem de VITE_API_PORT (padrão 3002) para evitar conflito
  // com outras aplicações locais que costumam ocupar a 3001.
  server: {
    port: 3000,
    open: true,
    proxy: { "/api": `http://localhost:${process.env.VITE_API_PORT || 3002}` },
  },
});
