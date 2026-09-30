import type { EstadoPublico, RegistroPartida, StatusHistorico } from './types';

const statusDe = (fase: string): StatusHistorico =>
  fase === 'FINALIZADA' ? 'FINALIZADA' : fase === 'CANCELADA' ? 'CANCELADA' : 'INTERROMPIDA';

/** Converte o estado (público) de uma partida encerrada em um registro de histórico. */
export function registroDe(
  e: Pick<EstadoPublico, 'id' | 'fase' | 'jogadores' | 'inicio' | 'fim' | 'motivo' | 'rodadas' | 'numeroMao' | 'vencedorId' | 'penalizadoId'>,
  jogadorLocalId: string,
  agora = new Date(),
): RegistroPartida {
  return {
    id: e.id,
    inicio: e.inicio,
    fim: e.fim ?? agora.toISOString(),
    status: statusDe(e.fase),
    motivo: e.motivo ?? 'DESCONEXAO',
    rodadas: e.rodadas,
    maos: e.numeroMao,
    vencedorId: e.vencedorId ?? null,
    penalizadoId: e.penalizadoId ?? null,
    jogadorLocalId,
    participantes: e.jogadores.map((j, i) => ({ id: j.id, nome: j.nome, posicao: i + 1, letras: j.letras, vitorias: j.vitorias })),
  };
}

export type ResultadoLocal = 'VENCEDOR' | 'PENALIZADO' | 'PARTICIPOU';

export function resultadoLocal(r: RegistroPartida): ResultadoLocal {
  if (r.vencedorId === r.jogadorLocalId) return 'VENCEDOR';
  if (r.penalizadoId === r.jogadorLocalId) return 'PENALIZADO';
  return 'PARTICIPOU';
}
