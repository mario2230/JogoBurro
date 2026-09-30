import { NAIPES, VALORES, type Carta } from './types';

export type Rng = () => number;

/** Baralho padrão com 13 valores e 4 naipes. */
export function criarBaralho(): Carta[] {
  return VALORES.flatMap((valor) => NAIPES.map((naipe) => ({ valor, naipe })));
}

/** Fisher-Yates. Aceita um RNG para permitir testes determinísticos. */
export function embaralhar<T>(itens: T[], rng: Rng = Math.random): T[] {
  const a = [...itens];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Entrega 4 cartas a cada jogador. */
export function distribuir(baralho: Carta[], ids: string[]): Record<string, Carta[]> {
  const maos: Record<string, Carta[]> = {};
  ids.forEach((id, i) => (maos[id] = baralho.slice(i * 4, i * 4 + 4)));
  return maos;
}

export const mesmaCarta = (a: Carta, b: Carta) => a.valor === b.valor && a.naipe === b.naipe;
