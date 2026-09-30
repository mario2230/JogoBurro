// Tipos do domínio. Nenhum import de Ionic/Capacitor aqui (lógica pura, testável).

export type Naipe = 'copas' | 'espadas' | 'ouros' | 'paus';
export const NAIPES: Naipe[] = ['copas', 'espadas', 'ouros', 'paus'];

export type Valor = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export const VALORES: Valor[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export interface Carta {
  valor: Valor;
  naipe: Naipe;
}

export interface Jogador {
  id: string;
  nome: string;
  /** Quantidade de letras de B-U-R-R-O acumuladas (0 a 5). */
  letras: number;
  /** Quantas vezes bateu primeiro. Usado no desempate. */
  vitorias: number;
  conectado: boolean;
  anfitriao: boolean;
}

export type Fase =
  | 'SALA'
  | 'JOGANDO'
  | 'BATIDA' // alguém completou 4 iguais; os demais precisam bater
  | 'FIM_MAO' // mão resolvida, aguardando a próxima
  | 'FINALIZADA'
  | 'CANCELADA'
  | 'INTERROMPIDA';

export type MotivoFim = 'VITORIA' | 'ABANDONO' | 'DESCONEXAO' | 'CANCELADA_PELO_ANFITRIAO';

export interface ResultadoMao {
  primeiroId: string;
  penalizadoId: string;
}

/** Estado completo. Existe somente no dispositivo do anfitrião. */
export interface EstadoPartida {
  id: string;
  fase: Fase;
  jogadores: Jogador[]; // a ordem do array é a ordem de jogo
  maos: Record<string, Carta[]>;
  vez: number; // índice de quem deve escolher e enviar uma carta
  rodadas: number; // total de cartas passadas na partida
  numeroMao: number; // quantos baralhos foram distribuídos
  ordemBatida: string[]; // ids na ordem em que bateram na mão atual
  ultimoResultado?: ResultadoMao;
  inicio: string;
  fim?: string;
  motivo?: MotivoFim;
  vencedorId?: string;
  penalizadoId?: string;
  pausada: boolean; // true enquanto aguarda reconexão
}

/** Estado enviado aos convidados: NÃO contém as mãos. */
export interface EstadoPublico {
  id: string;
  fase: Fase;
  jogadores: Jogador[];
  vez: number;
  rodadas: number;
  numeroMao: number;
  ordemBatida: string[];
  ultimoResultado?: ResultadoMao;
  inicio: string;
  fim?: string;
  motivo?: MotivoFim;
  vencedorId?: string;
  penalizadoId?: string;
  pausada: boolean;
  qtdCartas: Record<string, number>;
}

export const PALAVRA = 'BURRO';
export const MIN_JOGADORES = 2;
export const MAX_JOGADORES = 5;

export type ResultadoValidacao = { ok: true } | { ok: false; codigo: string; mensagem: string };

// ---------- Histórico (persistência local) ----------
export type StatusHistorico = 'FINALIZADA' | 'CANCELADA' | 'INTERROMPIDA';

export interface ParticipanteHistorico {
  id: string;
  nome: string;
  posicao: number;
  letras: number;
  vitorias: number;
}

export interface RegistroPartida {
  id: string;
  inicio: string;
  fim: string;
  status: StatusHistorico;
  motivo: MotivoFim;
  rodadas: number;
  maos: number;
  vencedorId: string | null;
  penalizadoId: string | null;
  jogadorLocalId: string;
  participantes: ParticipanteHistorico[];
}
