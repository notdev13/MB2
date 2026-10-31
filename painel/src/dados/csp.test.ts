import { describe, expect, it } from 'vitest';
import fonte from '../../vite.config.ts?raw';

// A leitura de PDF (pdf.js) e a leitura de print (OCR) não podem afrouxar a política de conteúdo do
// painel além do combinado. Única exceção, de propósito: 'wasm-unsafe-eval' em script-src, que o leitor
// de print (WebAssembly do tesseract) exige; 'unsafe-eval' de verdade segue proibido (docs/privacidade.md).
// Este teste só confere o TEXTO da política no vite.config.ts (não roda o navegador): serve para
// ninguém "resolver" um erro de CSP abrindo a porta. A prova no navegador é conferida à mão.
describe('política de conteúdo (CSP) do build', () => {
  const politica = /const politica = \[([\s\S]*?)\]\.join/.exec(fonte)?.[1] ?? '';

  it('encontrou a política no vite.config.ts', () => expect(politica).toContain("default-src 'self'"));
  it("scripts só do próprio endereço (mais 'wasm-unsafe-eval'), sem 'unsafe-eval', 'unsafe-inline' nem blob:", () => {
    const script = /script-src ([^"]*)"/.exec(politica)?.[1] ?? '';
    expect(script.trim()).toBe("'self' 'wasm-unsafe-eval'");
    // 'unsafe-eval' puro: o texto antes de "unsafe-eval" não pode ser "wasm-".
    expect(/(?<!wasm-)unsafe-eval/.test(politica)).toBe(false);
    for (const proibido of ['blob:', 'data:text', 'strict-dynamic', ' *']) {
      expect(politica.includes(proibido), proibido).toBe(false);
    }
    expect((politica.match(/wasm-unsafe-eval/g) ?? []).length).toBe(1);
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
