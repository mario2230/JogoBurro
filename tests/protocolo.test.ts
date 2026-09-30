import { describe, expect, it } from 'vitest';
import { fragmentar, Remontador, TAMANHO_PACOTE } from '../src/domain/fragmentador';
import { interpretar, serializar, type Mensagem } from '../src/domain/protocolo';
import { estadoPublico, criarPartida } from '../src/domain/regras';

const jogada: Mensagem = {
  tipo: 'JOGADA',
  partidaId: 'partida-01',
  jogadorId: 'jogador-01',
  seq: 1,
  carta: { valor: '7', naipe: 'copas' },
};

describe('protocolo', () => {
  it('aceita o exemplo do documento de requisitos', () => {
    expect(interpretar(JSON.stringify({ ...jogada }))).toEqual(jogada);
  });
  it('rejeita JSON inválido, tipo desconhecido e carta malformada', () => {
    expect(interpretar('não é json')).toBeNull();
    expect(interpretar(JSON.stringify({ ...jogada, tipo: 'HACK' }))).toBeNull();
    expect(interpretar(JSON.stringify({ ...jogada, carta: { valor: '99', naipe: 'copas' } }))).toBeNull();
    expect(interpretar(JSON.stringify({ tipo: 'JOGADA' }))).toBeNull();
  });
  it('valida o estado embutido em mensagens do anfitrião', () => {
    const estado = estadoPublico(criarPartida('p1', { id: 'j1', nome: 'Ana' }));
    const m: Mensagem = { tipo: 'ESTADO_PARTIDA', partidaId: 'p1', jogadorId: 'j1', seq: 3, estado };
    expect(interpretar(serializar(m))).toEqual(m);
  });
});

describe('fragmentação', () => {
  it('nenhum pacote passa de 20 bytes', () => {
    const pacotes = fragmentar(serializar(jogada), 7, 1);
    expect(pacotes.length).toBeGreaterThan(1);
    pacotes.forEach((p) => expect(p.length).toBeLessThanOrEqual(TAMANHO_PACOTE));
  });
  it('remonta mesmo com fragmentos fora de ordem e acentos (UTF-8)', () => {
    const texto = JSON.stringify({ nome: 'José da Conceição', x: 'ção'.repeat(40) });
    const pacotes = fragmentar(texto, 1, 9).reverse();
    const r = new Remontador();
    let saida: string | null = null;
    for (const p of pacotes) saida = r.receber(p) ?? saida;
    expect(saida).toBe(texto);
  });
  it('não mistura mensagens de remetentes diferentes com o mesmo msgId', () => {
    const a = fragmentar('A'.repeat(50), 1, 5);
    const b = fragmentar('B'.repeat(50), 2, 5);
    const r = new Remontador();
    const saidas: string[] = [];
    a.forEach((p, i) => {
      const x = r.receber(p);
      if (x) saidas.push(x);
      const y = r.receber(b[i]);
      if (y) saidas.push(y);
    });
    expect(saidas.sort()).toEqual(['A'.repeat(50), 'B'.repeat(50)]);
  });
  it('descarta mensagens incompletas expiradas', () => {
    let t = 0;
    const r = new Remontador(1000, () => t);
    const p = fragmentar('X'.repeat(60), 1, 1);
    r.receber(p[0]);
    t = 5000;
    let saida: string | null = null;
    for (const x of p.slice(1)) saida = r.receber(x) ?? saida;
    expect(saida).toBeNull();
  });
});
