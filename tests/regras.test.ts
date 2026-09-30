import { describe, expect, it } from 'vitest';
import { criarBaralho, embaralhar } from '../src/domain/baralho';
import {
  adicionarJogador,
  aplicarBater,
  aplicarJogada,
  calcularResultado,
  criarPartida,
  estadoPublico,
  finalizar,
  iniciarPartida,
  marcarConexao,
  podeIniciar,
  proximaMao,
  removerJogadorDaSala,
  temQuadra,
  validarJogada,
} from '../src/domain/regras';
import { VALORES, type Carta, type EstadoPartida } from '../src/domain/types';

const c = (valor: Carta['valor'], naipe: Carta['naipe'] = 'copas'): Carta => ({ valor, naipe });

function sala(n: number): EstadoPartida {
  let e = criarPartida('p1', { id: 'j1', nome: 'Ana' });
  for (let i = 2; i <= n; i++) e = adicionarJogador(e, `j${i}`, `Jogador ${i}`).estado;
  return e;
}
const sequencial = () => 0.999; // RNG determinístico (não troca posições)

describe('sala', () => {
  it('cria partida com o anfitrião', () => {
    const e = sala(1);
    expect(e.jogadores[0]).toMatchObject({ id: 'j1', anfitriao: true });
  });
  it('só inicia com pelo menos 2 jogadores', () => {
    expect(podeIniciar(sala(1)).ok).toBe(false);
    expect(podeIniciar(sala(2)).ok).toBe(true);
  });
  it('aceita até 5 jogadores e recusa o 6º', () => {
    const e = sala(5);
    expect(e.jogadores).toHaveLength(5);
    const r = adicionarJogador(e, 'j6', 'Extra');
    expect(r.validacao.ok).toBe(false);
  });
  it('recusa jogador duplicado e entrada com a partida em andamento', () => {
    expect(adicionarJogador(sala(2), 'j2', 'Outro').validacao.ok).toBe(false);
    const andamento = iniciarPartida(sala(2));
    expect(adicionarJogador(andamento, 'j9', 'Tarde').validacao.ok).toBe(false);
  });
  it('permite sair da sala antes de começar', () => {
    expect(removerJogadorDaSala(sala(3), 'j2').jogadores.map((j) => j.id)).toEqual(['j1', 'j3']);
  });
});

describe('distribuição', () => {
  it.each([2, 3, 4, 5])('com %i jogadores: 4 cartas cada, sem repetição', (n) => {
    const e = iniciarPartida(sala(n));
    const todas = Object.values(e.maos).flat();
    expect(Object.keys(e.maos)).toHaveLength(n);
    Object.values(e.maos).forEach((m) => expect(m).toHaveLength(4));
    expect(new Set(todas.map((x) => x.valor + x.naipe)).size).toBe(4 * n);
  });
  it('baralho tem 52 cartas e embaralhar preserva todas', () => {
    const b = criarBaralho();
    expect(b).toHaveLength(52);
    expect(embaralhar(b)).toHaveLength(52);
    expect(new Set(b.map((x) => x.valor + x.naipe)).size).toBe(52);
  });
  it('mesa com 2 jogadores usa valores além de A e 2 e recebe uma quadra possível', () => {
    const e = iniciarPartida(sala(2), sequencial);
    const cartas = Object.values(e.maos).flat();
    expect(cartas.some((x) => x.valor !== 'A' && x.valor !== '2')).toBe(true);
    expect(VALORES.some((valor) => cartas.filter((x) => x.valor === valor).length === 4)).toBe(true);
  });
  it('estado público não expõe as mãos', () => {
    const p = estadoPublico(iniciarPartida(sala(3)));
    expect(p).not.toHaveProperty('maos');
    expect(p.qtdCartas).toEqual({ j1: 4, j2: 4, j3: 4 });
  });
});

describe('troca de cartas e turnos', () => {
  it('passa a carta ao próximo e avança a vez', () => {
    const e = iniciarPartida(sala(3), sequencial);
    const carta = e.maos.j1[0];
    const { estado, troca } = aplicarJogada(e, 'j1', carta);
    expect(troca).toEqual({ de: 'j1', para: 'j2' });
    expect(estado.maos.j1).toHaveLength(3);
    expect(estado.maos.j2).toHaveLength(5);
    expect(estado.maos.j2).toContainEqual(carta);
    expect(estado.vez).toBe(1);
    expect(estado.rodadas).toBe(1);
  });
  it('bloqueia jogada fora do turno', () => {
    const e = iniciarPartida(sala(3), sequencial);
    const v = validarJogada(e, 'j2', e.maos.j2[0]);
    expect(v).toMatchObject({ ok: false, codigo: 'FORA_DO_TURNO' });
    expect(() => aplicarJogada(e, 'j2', e.maos.j2[0])).toThrow();
  });
  it('bloqueia carta que o jogador não possui', () => {
    const e = iniciarPartida(sala(2), sequencial);
    expect(validarJogada(e, 'j1', e.maos.j2[0])).toMatchObject({ ok: false, codigo: 'CARTA_INVALIDA' });
  });
  it('após uma volta completa todos voltam a ter 4 cartas', () => {
    let e = iniciarPartida(sala(4), sequencial);
    for (let i = 0; i < 4; i++) e = aplicarJogada(e, e.jogadores[e.vez].id, e.maos[e.jogadores[e.vez].id][0]).estado;
    Object.values(e.maos).forEach((m) => expect(m).toHaveLength(4));
    expect(e.vez).toBe(0);
  });
  it('bloqueia jogadas enquanto a partida está pausada', () => {
    let e = iniciarPartida(sala(2), sequencial);
    e = marcarConexao(e, 'j2', false);
    expect(validarJogada(e, 'j1', e.maos.j1[0])).toMatchObject({ ok: false, codigo: 'PAUSADA' });
    e = marcarConexao(e, 'j2', true);
    expect(validarJogada(e, 'j1', e.maos.j1[0]).ok).toBe(true);
  });
});

describe('quatro cartas iguais e BATER', () => {
  const comQuadra = (): EstadoPartida => {
    const e = iniciarPartida(sala(3), sequencial);
    return { ...e, maos: { ...e.maos, j1: [c('7', 'copas'), c('7', 'ouros'), c('7', 'paus'), c('7', 'espadas')] } };
  };
  it('detecta quatro iguais', () => {
    expect(temQuadra([c('7'), c('7', 'ouros'), c('7', 'paus'), c('7', 'espadas')])).toBe(true);
    expect(temQuadra([c('7'), c('7', 'ouros'), c('7', 'paus'), c('8')])).toBe(false);
  });
  it('não deixa bater sem quadra', () => {
    const base = iniciarPartida(sala(3), sequencial);
    // RNG fixo não embaralha: força uma mão sem quadra para j2.
    const e = { ...base, maos: { ...base.maos, j2: [c('2'), c('2', 'ouros'), c('3'), c('4')] } };
    expect(() => aplicarBater(e, 'j2')).toThrow();
  });
  it('o último a bater recebe a letra B e o primeiro ganha vitória', () => {
    let r = aplicarBater(comQuadra(), 'j1');
    expect(r.estado.fase).toBe('BATIDA');
    expect(r.fimDeMao).toBeUndefined();
    r = aplicarBater(r.estado, 'j2');
    expect(r.fimDeMao).toEqual({ primeiroId: 'j1', penalizadoId: 'j3', partidaTerminou: false });
    expect(r.estado.fase).toBe('FIM_MAO');
    expect(r.estado.jogadores.find((j) => j.id === 'j3')!.letras).toBe(1);
    expect(r.estado.jogadores.find((j) => j.id === 'j1')!.vitorias).toBe(1);
  });
  it('não deixa bater duas vezes', () => {
    const r = aplicarBater(comQuadra(), 'j1');
    expect(() => aplicarBater(r.estado, 'j1')).toThrow();
  });
  it('próxima mão redistribui, mantém letras e gira quem começa', () => {
    let r = aplicarBater(comQuadra(), 'j1');
    r = aplicarBater(r.estado, 'j2');
    const nova = proximaMao(r.estado, sequencial);
    expect(nova.fase).toBe('JOGANDO');
    expect(nova.numeroMao).toBe(2);
    expect(nova.vez).toBe(1);
    expect(nova.jogadores.find((j) => j.id === 'j3')!.letras).toBe(1);
    Object.values(nova.maos).forEach((m) => expect(m).toHaveLength(4));
  });
});

describe('fim da partida', () => {
  it('encerra quando alguém completa BURRO (5 letras)', () => {
    let e = iniciarPartida(sala(2), sequencial);
    e = { ...e, jogadores: e.jogadores.map((j) => (j.id === 'j2' ? { ...j, letras: 4 } : j)) };
    e = { ...e, maos: { ...e.maos, j1: [c('7', 'copas'), c('7', 'ouros'), c('7', 'paus'), c('7', 'espadas')] } };
    const r = aplicarBater(e, 'j1');
    expect(r.fimDeMao?.partidaTerminou).toBe(true);
    expect(r.estado).toMatchObject({ fase: 'FINALIZADA', motivo: 'VITORIA', vencedorId: 'j1', penalizadoId: 'j2' });
    expect(r.estado.fim).toBeDefined();
  });
  it('calcula vencedor por vitórias e desempata por menos letras', () => {
    const base = { conectado: true, anfitriao: false };
    const r = calcularResultado([
      { id: 'a', nome: 'A', letras: 2, vitorias: 1, ...base },
      { id: 'b', nome: 'B', letras: 1, vitorias: 1, ...base },
      { id: 'c', nome: 'C', letras: 4, vitorias: 0, ...base },
    ]);
    expect(r).toEqual({ vencedorId: 'b', penalizadoId: 'c' });
  });
  it('registra desconexão e cancelamento com fases próprias', () => {
    const e = iniciarPartida(sala(2), sequencial);
    expect(finalizar(e, 'DESCONEXAO').fase).toBe('INTERROMPIDA');
    expect(finalizar(e, 'CANCELADA_PELO_ANFITRIAO').fase).toBe('CANCELADA');
  });
});
