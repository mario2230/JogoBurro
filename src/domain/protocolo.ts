import { z } from 'zod';

// ---------- Blocos reutilizáveis ----------
const id = z.string().min(1).max(40);
const naipeS = z.enum(['copas', 'espadas', 'ouros', 'paus']);
const valorS = z.enum(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);
export const cartaSchema = z.object({ valor: valorS, naipe: naipeS });

const jogadorS = z.object({
  id,
  nome: z.string().min(1).max(20),
  letras: z.number().int().min(0).max(5),
  vitorias: z.number().int().min(0),
  conectado: z.boolean(),
  anfitriao: z.boolean(),
});

const faseS = z.enum(['SALA', 'JOGANDO', 'BATIDA', 'FIM_MAO', 'FINALIZADA', 'CANCELADA', 'INTERROMPIDA']);
const motivoS = z.enum(['VITORIA', 'ABANDONO', 'DESCONEXAO', 'CANCELADA_PELO_ANFITRIAO']);

export const estadoPublicoSchema = z.object({
  id,
  fase: faseS,
  jogadores: z.array(jogadorS).min(1).max(6),
  vez: z.number().int().min(0),
  rodadas: z.number().int().min(0),
  numeroMao: z.number().int().min(0),
  ordemBatida: z.array(id),
  ultimoResultado: z.object({ primeiroId: id, penalizadoId: id }).optional(),
  inicio: z.string(),
  fim: z.string().optional(),
  motivo: motivoS.optional(),
  vencedorId: id.optional(),
  penalizadoId: id.optional(),
  pausada: z.boolean(),
  qtdCartas: z.record(z.number().int().min(0)),
});

// ---------- Envelope comum a todas as mensagens ----------
// tipo, partidaId, jogadorId (quem enviou) e seq (contador por remetente, descarta duplicadas).
// token: segredo do convidado, enviado em toda mensagem convidado -> anfitrião.
// destinatarioId: quando presente, só esse jogador processa a mensagem.
const base = {
  partidaId: z.string().max(40),
  jogadorId: id,
  seq: z.number().int().min(0),
  token: z.string().max(40).optional(),
  destinatarioId: id.optional(),
};

const msg = <T extends string, S extends z.ZodRawShape>(tipo: T, shape: S) =>
  z.object({ tipo: z.literal(tipo), ...base, ...shape });

export const mensagemSchema = z.discriminatedUnion('tipo', [
  // convidado -> anfitrião
  msg('SOLICITACAO_ENTRADA', { nome: z.string().min(1).max(20) }),
  msg('SAIDA', {}),
  msg('JOGADA', { carta: cartaSchema }),
  msg('JOGADOR_COMPLETOU', { estado: estadoPublicoSchema.optional() }), // convidado envia sem estado; anfitrião responde com
  msg('RECONEXAO', {}),
  msg('PING', {}),
  // anfitrião -> convidados
  msg('ENTRADA_ACEITA', { estado: estadoPublicoSchema }),
  msg('ENTRADA_RECUSADA', { motivo: z.string().max(80) }),
  msg('JOGADOR_ENTROU', { estado: estadoPublicoSchema }),
  msg('JOGADOR_SAIU', { estado: estadoPublicoSchema }),
  msg('PARTIDA_INICIADA', { estado: estadoPublicoSchema }),
  msg('MAO_ATUALIZADA', { mao: z.array(cartaSchema).max(6) }),
  msg('TROCA_REALIZADA', { de: id, para: id, estado: estadoPublicoSchema }),
  msg('PARTIDA_FINALIZADA', { estado: estadoPublicoSchema }),
  msg('JOGADOR_DESCONECTADO', { estado: estadoPublicoSchema }),
  msg('ESTADO_PARTIDA', { estado: estadoPublicoSchema }),
  msg('ERRO', { codigo: z.string().max(40), mensagem: z.string().max(120) }),
]);

export type Mensagem = z.infer<typeof mensagemSchema>;
export type TipoMensagem = Mensagem['tipo'];
export type MensagemDe<T extends TipoMensagem> = Extract<Mensagem, { tipo: T }>;

export const TIPOS_DO_CONVIDADO: TipoMensagem[] = ['SOLICITACAO_ENTRADA', 'SAIDA', 'JOGADA', 'JOGADOR_COMPLETOU', 'RECONEXAO', 'PING'];

export const serializar = (m: Mensagem): string => JSON.stringify(m);

/** Valida o formato ANTES de qualquer alteração de estado. Retorna null se inválida. */
export function interpretar(texto: string): Mensagem | null {
  try {
    const r = mensagemSchema.safeParse(JSON.parse(texto));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}
