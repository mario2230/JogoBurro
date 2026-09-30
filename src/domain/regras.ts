import { criarBaralho, distribuir, embaralhar, mesmaCarta, type Rng } from './baralho';
import {
  MAX_JOGADORES,
  MIN_JOGADORES,
  PALAVRA,
  VALORES,
  type Carta,
  type EstadoPartida,
  type EstadoPublico,
  type Jogador,
  type MotivoFim,
  type ResultadoValidacao,
} from './types';

const ok = (): ResultadoValidacao => ({ ok: true });
const erro = (codigo: string, mensagem: string): ResultadoValidacao => ({ ok: false, codigo, mensagem });

export const letrasDe = (n: number) => PALAVRA.slice(0, n);

// ---------- Consultas ----------
export function temQuadra(mao: Carta[]): boolean {
  const cont: Record<string, number> = {};
  for (const c of mao) cont[c.valor] = (cont[c.valor] ?? 0) + 1;
  return Object.values(cont).some((n) => n >= 4);
}

export const jogadorDaVez = (e: EstadoPartida): Jogador => e.jogadores[e.vez];
export const proximoIndice = (e: EstadoPartida, i = e.vez) => (i + 1) % e.jogadores.length;
export const anteriorIndice = (e: EstadoPartida, i = e.vez) => (i - 1 + e.jogadores.length) % e.jogadores.length;

// ---------- Sala ----------
export function criarPartida(id: string, anfitriao: { id: string; nome: string }, agora = new Date()): EstadoPartida {
  return {
    id,
    fase: 'SALA',
    jogadores: [novoJogador(anfitriao.id, anfitriao.nome, true)],
    maos: {},
    vez: 0,
    rodadas: 0,
    numeroMao: 0,
    ordemBatida: [],
    inicio: agora.toISOString(),
    pausada: false,
  };
}

const novoJogador = (id: string, nome: string, anfitriao = false): Jogador => ({
  id,
  nome,
  letras: 0,
  vitorias: 0,
  conectado: true,
  anfitriao,
});

export function adicionarJogador(e: EstadoPartida, id: string, nome: string): { estado: EstadoPartida; validacao: ResultadoValidacao } {
  if (e.fase !== 'SALA') return { estado: e, validacao: erro('PARTIDA_EM_ANDAMENTO', 'A partida já começou.') };
  if (e.jogadores.length >= MAX_JOGADORES) return { estado: e, validacao: erro('SALA_CHEIA', `A sala já tem ${MAX_JOGADORES} jogadores.`) };
  if (e.jogadores.some((j) => j.id === id)) return { estado: e, validacao: erro('JOGADOR_DUPLICADO', 'Jogador já está na sala.') };
  return { estado: { ...e, jogadores: [...e.jogadores, novoJogador(id, nome)] }, validacao: ok() };
}

export function removerJogadorDaSala(e: EstadoPartida, id: string): EstadoPartida {
  if (e.fase !== 'SALA') return e;
  return { ...e, jogadores: e.jogadores.filter((j) => j.id !== id) };
}

// ---------- Início e mãos ----------
export function podeIniciar(e: EstadoPartida): ResultadoValidacao {
  if (e.fase !== 'SALA') return erro('FASE_INVALIDA', 'A partida já foi iniciada.');
  if (e.jogadores.length < MIN_JOGADORES) return erro('POUCOS_JOGADORES', `São necessários ao menos ${MIN_JOGADORES} jogadores.`);
  return ok();
}

export function iniciarPartida(e: EstadoPartida, rng: Rng = Math.random, agora = new Date()): EstadoPartida {
  const v = podeIniciar(e);
  if (!v.ok) throw new Error(v.mensagem);
  return distribuirMao({ ...e, inicio: agora.toISOString(), numeroMao: 0 }, rng);
}

/** Embaralha o baralho completo, entrega 4 cartas a cada um e define quem começa. */
export function distribuirMao(e: EstadoPartida, rng: Rng = Math.random): EstadoPartida {
  const ids = e.jogadores.map((j) => j.id);
  const baralho = embaralhar(criarBaralho(), rng);
  let cartasDaMao = baralho.slice(0, ids.length * 4);
  const temQuadraPossivel = VALORES.some((valor) => cartasDaMao.filter((c) => c.valor === valor).length === 4);
  const temValorForaDosDoisPrimeiros = cartasDaMao.some((c) => c.valor !== 'A' && c.valor !== '2');

  if (!temQuadraPossivel || !temValorForaDosDoisPrimeiros) {
    const valoresParaQuadra = VALORES.slice(2);
    const indiceValor = Math.min(valoresParaQuadra.length - 1, Math.floor(rng() * valoresParaQuadra.length));
    const valorGarantido = valoresParaQuadra[indiceValor];
    const restantes = embaralhar(baralho.filter((c) => c.valor !== valorGarantido), rng);
    cartasDaMao = embaralhar(
      [...baralho.filter((c) => c.valor === valorGarantido), ...restantes.slice(0, ids.length * 4 - 4)],
      rng,
    );
  }

  const maos = distribuir(cartasDaMao, ids);
  return {
    ...e,
    fase: 'JOGANDO',
    maos,
    vez: e.numeroMao % ids.length,
    numeroMao: e.numeroMao + 1,
    ordemBatida: [],
    ultimoResultado: undefined,
  };
}

// ---------- Jogada (passar carta) ----------
export function validarJogada(e: EstadoPartida, jogadorId: string, carta: Carta): ResultadoValidacao {
  if (e.fase !== 'JOGANDO') return erro('FASE_INVALIDA', 'Não é possível jogar agora.');
  if (e.pausada) return erro('PAUSADA', 'A partida está pausada por causa de uma desconexão.');
  if (!e.jogadores.some((j) => j.id === jogadorId)) return erro('JOGADOR_DESCONHECIDO', 'Jogador não pertence à partida.');
  if (jogadorDaVez(e).id !== jogadorId) return erro('FORA_DO_TURNO', 'Não é a sua vez.');
  if (!(e.maos[jogadorId] ?? []).some((c) => mesmaCarta(c, carta))) return erro('CARTA_INVALIDA', 'Você não possui essa carta.');
  return ok();
}

export interface Troca {
  de: string;
  para: string;
}

export function aplicarJogada(e: EstadoPartida, jogadorId: string, carta: Carta): { estado: EstadoPartida; troca: Troca } {
  const v = validarJogada(e, jogadorId, carta);
  if (!v.ok) throw new Error(v.mensagem);
  const proximo = e.jogadores[proximoIndice(e)];
  const origem = e.maos[jogadorId];
  const idx = origem.findIndex((c) => mesmaCarta(c, carta));
  const novaOrigem = origem.filter((_, i) => i !== idx);
  const novoDestino = [...e.maos[proximo.id], carta];
  return {
    estado: {
      ...e,
      maos: { ...e.maos, [jogadorId]: novaOrigem, [proximo.id]: novoDestino },
      vez: proximoIndice(e),
      rodadas: e.rodadas + 1,
    },
    troca: { de: jogadorId, para: proximo.id },
  };
}

// ---------- Bater ----------
export function validarBater(e: EstadoPartida, jogadorId: string): ResultadoValidacao {
  if (!e.jogadores.some((j) => j.id === jogadorId)) return erro('JOGADOR_DESCONHECIDO', 'Jogador não pertence à partida.');
  if (e.ordemBatida.includes(jogadorId)) return erro('JA_BATEU', 'Você já bateu nesta mão.');
  if (e.fase === 'JOGANDO') {
    if (!temQuadra(e.maos[jogadorId] ?? [])) return erro('SEM_QUADRA', 'Você ainda não tem quatro cartas iguais.');
    return ok();
  }
  if (e.fase === 'BATIDA') return ok(); // os demais só precisam tocar
  return erro('FASE_INVALIDA', 'Não é possível bater agora.');
}

export interface ResultadoBater {
  estado: EstadoPartida;
  /** Preenchido quando a mão foi resolvida (só sobrou um jogador sem bater). */
  fimDeMao?: { primeiroId: string; penalizadoId: string; partidaTerminou: boolean };
}

export function aplicarBater(e: EstadoPartida, jogadorId: string): ResultadoBater {
  const v = validarBater(e, jogadorId);
  if (!v.ok) throw new Error(v.mensagem);
  const ordem = [...e.ordemBatida, jogadorId];
  let estado: EstadoPartida = { ...e, fase: 'BATIDA', ordemBatida: ordem };
  if (ordem.length < e.jogadores.length - 1) return { estado };

  // Só falta um jogador: ele é o penalizado da mão.
  const primeiroId = ordem[0];
  const penalizadoId = e.jogadores.find((j) => !ordem.includes(j.id))!.id;
  const jogadores = e.jogadores.map((j) => ({
    ...j,
    letras: j.id === penalizadoId ? j.letras + 1 : j.letras,
    vitorias: j.id === primeiroId ? j.vitorias + 1 : j.vitorias,
  }));
  estado = { ...estado, jogadores, fase: 'FIM_MAO', ultimoResultado: { primeiroId, penalizadoId } };
  const terminou = jogadores.find((j) => j.id === penalizadoId)!.letras >= PALAVRA.length;
  if (terminou) estado = finalizar(estado, 'VITORIA');
  return { estado, fimDeMao: { primeiroId, penalizadoId, partidaTerminou: terminou } };
}

export const proximaMao = (e: EstadoPartida, rng: Rng = Math.random) => distribuirMao(e, rng);

// ---------- Encerramento ----------
/**
 * Vencedor: maior número de "bateu primeiro"; desempate por menos letras; depois pela ordem de jogo.
 * Penalizado: quem completou BURRO (ou, se a partida foi interrompida, quem tem mais letras).
 */
export function calcularResultado(jogadores: Jogador[]): { vencedorId: string; penalizadoId: string } {
  const vencedor = [...jogadores].sort((a, b) => b.vitorias - a.vitorias || a.letras - b.letras)[0];
  const penalizado = [...jogadores].sort((a, b) => b.letras - a.letras)[0];
  return { vencedorId: vencedor.id, penalizadoId: penalizado.id };
}

export function finalizar(e: EstadoPartida, motivo: MotivoFim, agora = new Date()): EstadoPartida {
  const { vencedorId, penalizadoId } = calcularResultado(e.jogadores);
  const fase = motivo === 'VITORIA' ? 'FINALIZADA' : motivo === 'CANCELADA_PELO_ANFITRIAO' ? 'CANCELADA' : 'INTERROMPIDA';
  return { ...e, fase, motivo, fim: agora.toISOString(), vencedorId, penalizadoId, pausada: false };
}

export const partidaEncerrada = (e: { fase: string }) => ['FINALIZADA', 'CANCELADA', 'INTERROMPIDA'].includes(e.fase);

// ---------- Conexão ----------
export function marcarConexao(e: EstadoPartida, jogadorId: string, conectado: boolean): EstadoPartida {
  const jogadores = e.jogadores.map((j) => (j.id === jogadorId ? { ...j, conectado } : j));
  return { ...e, jogadores, pausada: e.fase === 'SALA' ? false : jogadores.some((j) => !j.conectado) };
}

// ---------- Visão pública (sem mãos) ----------
export function estadoPublico(e: EstadoPartida): EstadoPublico {
  const { maos, ...resto } = e;
  const qtdCartas: Record<string, number> = {};
  for (const j of e.jogadores) qtdCartas[j.id] = (maos[j.id] ?? []).length;
  return { ...resto, qtdCartas };
}
