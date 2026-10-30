import { describe, expect, it } from 'vitest';
import fonte from '../../vite.config.ts?raw';

// A leitura de PDF (pdf.js) não pode afrouxar a política de conteúdo do painel.
// Este teste só confere o TEXTO da política no vite.config.ts (não roda o navegador): serve para
// ninguém "resolver" um erro de CSP abrindo a porta. A prova no navegador é conferida à mão.
describe('política de conteúdo (CSP) do build', () => {
  const politica = /const politica = \[([\s\S]*?)\]\.join/.exec(fonte)?.[1] ?? '';

  it('encontrou a política no vite.config.ts', () => expect(politica).toContain("default-src 'self'"));
  it("scripts só do próprio endereço, sem 'unsafe-eval', 'wasm-unsafe-eval', 'unsafe-inline' nem blob:", () => {
    expect(politica).toContain(`"script-src 'self'"`);
    for (const proibido of ['unsafe-eval', 'wasm-unsafe-eval', 'blob:', 'data:text', 'strict-dynamic', ' *']) {
      expect(politica.includes(proibido), proibido).toBe(false);
    }
    const script = /script-src ([^"]*)"/.exec(politica)?.[1] ?? '';
    expect(script.trim()).toBe("'self'");
  });
  it("worker só do próprio endereço (worker-src 'self') e nada de object/frame liberado", () => {
    expect(politica).toContain(`"worker-src 'self'"`);
    expect(politica).not.toMatch(/object-src|frame-src|child-src/);
  });
  it('conexão só com o próprio endereço e o banco da nuvem (sem curinga)', () => {
    expect(politica).toContain("connect-src 'self'");
    expect(/connect-src[^"]*\*/.test(politica)).toBe(false);
  });
  it("'unsafe-inline' só em estilo (como já era)", () => {
    const usos = politica.match(/'unsafe-inline'/g) ?? [];
    expect(usos).toHaveLength(1);
    expect(/style-src[^"]*'unsafe-inline'/.test(politica)).toBe(true);
  });
});
