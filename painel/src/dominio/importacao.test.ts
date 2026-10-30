import { describe, expect, it } from 'vitest';
import { avaliarImportacao, avaliarImportacaoPdf, confirmacoesNecessarias } from './importacao';
import { aleatorio } from './ofx.fixtures';
import type { Conta, SaldoConta } from './tipos';

const HOJE = '2026-10-30';
const conta = (finalConta?: string): Conta => ({
  id: 'c1', nome: 'Conta Teste', banco: 'Banco Teste', obraId: null, ativa: true, criadoEm: '', atualizadoEm: '', ...(finalConta ? { finalConta } : {}),
});
let n = 0;
const saldo = (data: string, valor: number, fonte: 'manual' | 'extrato' = 'manual', contaId = 'c1'): SaldoConta =>
  ({ id: 's' + ++n, contaId, data, valor, fonte, obs: '', criadoEm: `2026-10-01T10:00:${String(n % 60).padStart(2, '0')}Z` });
const extrato = (data: string, valor: number, contaFinal = '0001') => ({ contaFinal, saldo: valor, data });

describe('avaliarImportacao · ordem das regras', () => {
  it('(a) final diferente do já gravado na conta: outra-conta', () => {
    const r = avaliarImportacao(extrato('2026-10-30', 100, '0002'), conta('0001'), [], HOJE);
    expect(r).toMatchObject({ ok: false, motivo: 'outra-conta' });
  });
  it('(a) vem antes das outras regras (extrato antigo de outra conta ainda é outra-conta)', () => {
    const r = avaliarImportacao(extrato('2026-01-01', 100, '0002'), conta('0001'), [saldo('2026-10-30', 100)], HOJE);
    expect(r).toMatchObject({ ok: false, motivo: 'outra-conta' });
  });
  it('conta sem final ainda aceita qualquer final (será gravado depois)', () => {
    expect(avaliarImportacao(extrato('2026-10-30', 100, '0777'), conta(), [], HOJE).ok).toBe(true);
  });
  it('(b) data mais antiga que o último saldo: rejeita com a mensagem pedida', () => {
    const r = avaliarImportacao(extrato('2026-10-28', 5_000), conta('0001'), [saldo('2026-10-30', 9_000)], HOJE);
    expect(r).toEqual({
      ok: false, motivo: 'antigo',
      mensagem: 'Este extrato é de 28/10/2026, mas o último saldo desta conta é de 30/10/2026. Não vou importar para não trocar um saldo novo por um antigo.',
    });
  });
  it('(b) um dia a menos já é antigo; mesma data não é', () => {
    const s = [saldo('2026-10-20', 1)];
    expect(avaliarImportacao(extrato('2026-10-19', 1), conta(), s, HOJE)).toMatchObject({ ok: false, motivo: 'antigo' });
    expect(avaliarImportacao(extrato('2026-10-20', 2), conta(), s, HOJE).ok).toBe(true);
    expect(avaliarImportacao(extrato('2026-10-21', 1), conta(), s, HOJE).ok).toBe(true);
  });
  it('(b) vale contra saldo manual e contra saldo vindo de extrato', () => {
    for (const fonte of ['manual', 'extrato'] as const) {
      expect(avaliarImportacao(extrato('2026-10-01', 1), conta(), [saldo('2026-10-02', 1, fonte)], HOJE)).toMatchObject({ motivo: 'antigo' });
    }
  });
  it('(b) olha o saldo mais recente, não o último lançado', () => {
    const s = [saldo('2026-10-25', 1), saldo('2026-10-10', 1)];
    expect(avaliarImportacao(extrato('2026-10-20', 1), conta(), s, HOJE)).toMatchObject({ motivo: 'antigo' });
  });
  it('(b) saldo de outra conta não conta', () => {
    expect(avaliarImportacao(extrato('2026-10-01', 1), conta(), [saldo('2026-10-29', 1, 'manual', 'outra')], HOJE).ok).toBe(true);
  });
  it('(c) mesma data e mesmo valor: repetido', () => {
    const r = avaliarImportacao(extrato('2026-10-30', 9_000), conta(), [saldo('2026-10-30', 9_000)], HOJE);
    expect(r).toMatchObject({ ok: false, motivo: 'repetido' });
    expect(r.ok === false && r.mensagem).toMatch(/já registrado/i);
  });
  it('(d) mesma data e valor diferente: permite, com aviso', () => {
    const r = avaliarImportacao(extrato('2026-10-30', 9_100), conta(), [saldo('2026-10-30', 9_000)], HOJE);
    expect(r).toMatchObject({ ok: true });
    expect(r.ok && r.aviso).toMatch(/mesmo dia do último saldo, valor diferente/i);
  });
  it('(e) extrato aceita no máximo hoje: amanhã já é futuro', () => {
    expect(avaliarImportacao(extrato('2026-10-31', 1), conta(), [], HOJE)).toMatchObject({ ok: false, motivo: 'futuro' });
    expect(avaliarImportacao(extrato('2026-11-01', 1), conta(), [], HOJE)).toMatchObject({ ok: false, motivo: 'futuro' });
    expect(avaliarImportacao(extrato('2026-10-30', 1), conta(), [], HOJE).ok).toBe(true);
  });
  it('(e) a virada de mês e de ano é calculada certo', () => {
    expect(avaliarImportacao(extrato('2026-12-31', 1), conta(), [], '2026-12-31').ok).toBe(true);
    expect(avaliarImportacao(extrato('2027-01-01', 1), conta(), [], '2026-12-31')).toMatchObject({ motivo: 'futuro' });
    expect(avaliarImportacao(extrato('2028-02-29', 1), conta(), [], '2028-02-29').ok).toBe(true);
    expect(avaliarImportacao(extrato('2028-02-29', 1), conta(), [], '2028-02-28')).toMatchObject({ motivo: 'futuro' });
  });
  it('(d) mesmo dia com valor diferente exige confirmação explícita; mudança pequena também', () => {
    const r = avaliarImportacao(extrato('2026-10-30', 9_100), conta(), [saldo('2026-10-30', 9_000)], HOJE);
    expect(r.ok && r.precisaConfirmarMesmoDia).toBe(true);
    expect(r.ok && r.precisaConfirmarMudancaGrande).toBeFalsy();
    const outroDia = avaliarImportacao(extrato('2026-10-30', 9_100), conta(), [saldo('2026-10-29', 9_000)], HOJE);
    expect(outroDia.ok && outroDia.precisaConfirmarMesmoDia).toBeFalsy();
    expect(r.ok && confirmacoesNecessarias(r)).toEqual(['mesmo-dia']);
  });
  it('(f) mudança grande (> 30%) exige confirmação extra; pequena não', () => {
    const s = [saldo('2026-10-20', 100_000)];
    const grande = avaliarImportacao(extrato('2026-10-30', 10_000), conta(), s, HOJE);
    expect(grande.ok && grande.precisaConfirmarMudancaGrande).toBe(true);
    const pequena = avaliarImportacao(extrato('2026-10-30', 110_000), conta(), s, HOJE);
    expect(pequena.ok && pequena.precisaConfirmarMudancaGrande).toBeFalsy();
  });
  it('devolve o saldo anterior; null quando a conta não tem saldo', () => {
    const s = saldo('2026-10-20', 100);
    const r = avaliarImportacao(extrato('2026-10-30', 100), conta(), [s], HOJE);
    expect(r.ok && r.anterior).toEqual(s);
    const vazio = avaliarImportacao(extrato('2026-10-30', 100), conta(), [], HOJE);
    expect(vazio.ok && vazio.anterior).toBeNull();
    expect(vazio.ok && vazio.precisaConfirmarMudancaGrande).toBeFalsy();
  });
});

describe('avaliarImportacao · saldo manual com data no futuro por engano', () => {
  const futuro = saldo('2027-03-15', 777); // digitado errado
  it('não trava a conta: o "último saldo" ignora saldos depois de hoje + 1 dia', () => {
    const r = avaliarImportacao(extrato('2026-10-30', 5_000), conta(), [saldo('2026-10-20', 1_000), futuro], HOJE);
    expect(r.ok).toBe(true);
  });
  it('avisa que existe saldo com data no futuro', () => {
    const r = avaliarImportacao(extrato('2026-10-30', 5_000), conta(), [futuro], HOJE);
    expect(r.ok && r.aviso).toMatch(/futuro/i);
  });
  it('a comparação usa o último saldo VÁLIDO (anterior), não o do futuro', () => {
    const antes = saldo('2026-10-20', 5_000);
    const r = avaliarImportacao(extrato('2026-10-19', 5_000), conta(), [antes, futuro], HOJE);
    expect(r).toMatchObject({ ok: false, motivo: 'antigo' });
    const ok = avaliarImportacao(extrato('2026-10-21', 5_000), conta(), [antes, futuro], HOJE);
    expect(ok.ok && ok.anterior).toEqual(antes);
  });
  it('saldo de amanhã (hoje + 1) ainda conta como saldo normal', () => {
    const amanha = saldo('2026-10-31', 1_000);
    expect(avaliarImportacao(extrato('2026-10-30', 1_000), conta(), [amanha], HOJE)).toMatchObject({ ok: false, motivo: 'antigo' });
  });
  it('futuro de OUTRA conta não gera aviso', () => {
    const r = avaliarImportacao(extrato('2026-10-30', 5_000), conta(), [saldo('2027-03-15', 1, 'manual', 'outra')], HOJE);
    expect(r.ok && r.aviso).toBeUndefined();
  });
});

describe('avaliarImportacao · propriedades (a regra de ouro)', () => {
  const dia = (rnd: () => number) => {
    const d = new Date(Date.UTC(2025, 0, 1) + Math.floor(rnd() * 900) * 86_400_000);
    return d.toISOString().slice(0, 10);
  };
  const mais = (iso: string, k: number) => new Date(Date.parse(iso + 'T00:00:00Z') + k * 86_400_000).toISOString().slice(0, 10);

  it('QUALQUER extrato mais antigo que o último saldo é rejeitado como "antigo" (500 sementes)', () => {
    for (let semente = 1; semente <= 500; semente++) {
      const rnd = aleatorio(semente);
      const hoje = dia(rnd);
      const qtd = 1 + Math.floor(rnd() * 6);
      const saldos: SaldoConta[] = [];
      for (let i = 0; i < qtd; i++) {
        saldos.push(saldo(mais(hoje, -Math.floor(rnd() * 60)), Math.floor((rnd() - 0.5) * 1e9), rnd() < 0.5 ? 'manual' : 'extrato'));
      }
      if (rnd() < 0.4) saldos.push(saldo(mais(hoje, 2 + Math.floor(rnd() * 400)), 1)); // saldo futuro por engano
      const validos = saldos.filter((s) => s.data <= mais(hoje, 1));
      const ultima = validos.map((s) => s.data).sort().at(-1)!;
      const dataExtrato = mais(ultima, -(1 + Math.floor(rnd() * 90)));
      const final = rnd() < 0.5 ? '0001' : undefined;
      const r = avaliarImportacao(extrato(dataExtrato, Math.floor((rnd() - 0.5) * 1e9)), conta(final), saldos, hoje);
      expect(r.ok, `semente ${semente}`).toBe(false);
      expect(!r.ok && r.motivo, `semente ${semente}`).toBe('antigo');
    }
  });
  it('mesma data e mesmo valor do último saldo é sempre "repetido" (300 sementes)', () => {
    for (let semente = 1; semente <= 300; semente++) {
      const rnd = aleatorio(semente + 9000);
      const hoje = dia(rnd);
      const d = mais(hoje, -Math.floor(rnd() * 30));
      const valor = Math.floor((rnd() - 0.5) * 1e9);
      const saldos = [saldo(mais(d, -1 - Math.floor(rnd() * 20)), 5), saldo(d, valor)];
      const r = avaliarImportacao(extrato(d, valor), conta(), saldos, hoje);
      expect(!r.ok && r.motivo, `semente ${semente}`).toBe('repetido');
    }
  });
  it('saldo manual futuro nunca trava: um extrato válido de hoje sempre passa (300 sementes)', () => {
    for (let semente = 1; semente <= 300; semente++) {
      const rnd = aleatorio(semente + 5000);
      const hoje = dia(rnd);
      const saldos = [saldo(mais(hoje, 2 + Math.floor(rnd() * 3000)), Math.floor((rnd() - 0.5) * 1e6))];
      if (rnd() < 0.5) saldos.push(saldo(mais(hoje, -5 - Math.floor(rnd() * 30)), 10));
      const r = avaliarImportacao(extrato(hoje, 10), conta(), saldos, hoje);
      expect(r.ok, `semente ${semente}`).toBe(true);
    }
  });
  it('final diferente nunca passa, qualquer que seja o resto (300 sementes)', () => {
    for (let semente = 1; semente <= 300; semente++) {
      const rnd = aleatorio(semente + 777);
      const hoje = dia(rnd);
      const r = avaliarImportacao(extrato(mais(hoje, -Math.floor(rnd() * 5)), 1, '0002'), conta('0001'),
        rnd() < 0.5 ? [] : [saldo(mais(hoje, -3), 1)], hoje);
      expect(!r.ok && r.motivo, `semente ${semente}`).toBe('outra-conta');
    }
  });
});

describe('avaliarImportacaoPdf · data escolhida x período e datas do PDF', () => {
  const pdf = (data: string, saldos: SaldoConta[] = [], fim?: string, datas?: string[]) =>
    avaliarImportacaoPdf({ saldo: 100, data }, conta(), saldos, HOJE, fim, datas);
  it('data até 3 dias depois do fim do período: sem confirmação extra', () => {
    const r = pdf('2026-10-29', [], '2026-10-26');
    expect(r.ok && r.precisaConfirmarDataPosterior).toBeFalsy();
  });
  it('data mais de 3 dias depois do fim do período: exige confirmação extra', () => {
    const r = pdf('2026-10-30', [], '2026-10-26');
    expect(r.ok && r.precisaConfirmarDataPosterior).toBe(true);
    expect(r.ok && r.aviso).toMatch(/depois do fim do período/i);
    expect(r.ok && confirmacoesNecessarias(r)).toContain('data-posterior');
  });
  it('sem fim de período: data fora das datas do PDF exige confirmação; dentro, não', () => {
    const fora = pdf('2026-10-30', [], undefined, ['2026-10-10', '2026-10-12']);
    expect(fora.ok && fora.precisaConfirmarDataPosterior).toBe(true);
    const dentro = pdf('2026-10-12', [], undefined, ['2026-10-10', '2026-10-12']);
    expect(dentro.ok && dentro.precisaConfirmarDataPosterior).toBeFalsy();
  });
  it('a regra de ouro continua sem contorno (data antes do último saldo é recusada)', () => {
    const r = pdf('2026-10-20', [saldo('2026-10-25', 1)], '2026-10-10');
    expect(r).toMatchObject({ ok: false, motivo: 'antigo' });
  });
  it('mesmo dia com valor diferente também exige confirmação no PDF', () => {
    const r = pdf('2026-10-30', [saldo('2026-10-30', 5)], '2026-10-30', ['2026-10-30']);
    expect(r.ok && r.precisaConfirmarMesmoDia).toBe(true);
  });
  it('ano fora de 1990 até o ano atual + 1 é recusado', () => {
    for (const d of ['1989-12-31', '0202-10-30', '2028-01-01', '9999-01-01']) {
      expect(pdf(d)).toMatchObject({ ok: false, motivo: 'data-invalida' });
    }
    expect(pdf('1990-01-01').ok).toBe(true);
  });
});
