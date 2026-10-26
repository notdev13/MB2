import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: o painel funciona em qualquer endereço (raiz do domínio ou subpasta).
export default defineConfig({
  base: './',
  plugins: [react()],
});
