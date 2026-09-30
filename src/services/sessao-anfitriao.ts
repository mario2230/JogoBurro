import {
  adicionarJogador,
  aplicarBater,
  aplicarJogada,
  criarPartida,
  estadoPublico,
  finalizar,
  iniciarPartida,
  marcarConexao,
  partidaEncerrada,
  podeIniciar,
  proximaMao,
  removerJogadorDaSala,
  validarBater,
  validarJogada,
} from '@/domain/regras';
import { interpretar, serializar, TIPOS_DO_CONVIDADO, type Mensagem, type TipoMensagem } from '@/domain/protocolo';
import type { Carta, EstadoPartida, MotivoFim } from '@/domain/types';
import type { TransporteAnfitriao } from './bluetooth';

export const TEMPO_SEM_SINAL_MS = 15_000; // sem mensagens/PING => considerado desconectado
export const TEMPO_RECONEXAO_MS = 60_000; // depois disso a partida é interrompida
export const PAUSA_ENTRE_MAOS_MS = 5_000;

export interface EventosAnfitriao {
  aoMudarEstado(e: EstadoPartida): void;
  aoSolicitarEntrada(s: { id: string; nome: string }[]): void;
  aoErro(mensagem: string): void;
  aoEncerrar(e: EstadoPartida): void;
}

type CamposExtras<T extends TipoMensagem> = Omit<Extract<Mensagem, { tipo: T }>, 'tipo' | 'partidaId' | 'jogadorId' | 'seq' | 'token' | 'destinatarioId'>;

/**
 * O anfitrião é a ÚNICA fonte da verdade: embaralha, valida turno e jogada, guarda as mãos.
 * Os convidados só enviam intenções (JOGADA, JOGADOR_COMPLETOU...).
 */
export class SessaoAnfitriao {
  estado: EstadoPartida;
  private seq = 0;
  private tokens = new Map<string, string>(); // jogadorId -> token
  private ultimoSeq = new Map<string, number>();
  private ultimoSinal = new Map<string, number>();
  private pendentes = new Map<string, { id: string; nome: string; token: string }>();
  private timerVigia?: ReturnType<typeof setInterval>;
  private timerReconexao?: ReturnType<typeof setTimeout>;
  private timerProximaMao?: ReturnType<typeof setTimeout>;
  private encerradaNotificada = false;

  constructor(
    private transporte: TransporteAnfitriao,
    private eu: { id: string; nome: string },
    private ev: EventosAnfitriao,
    partidaId: string,
    private rng: () => number = Math.random,
  ) {
    this.estado = criarPartida(partidaId, eu);
  }

  // ---------- ciclo de vida ----------
  async abrirSala() {
    this.transporte.aoReceber((t) => this.receber(t));
    await this.transporte.iniciar(`Burro de ${this.eu.nome}`.slice(0, 20));
    this.timerVigia = setInterval(() => this.vigiar(), 3000);
    this.ev.aoMudarEstado(this.estado);
  }

  async fechar() {
    clearInterval(this.timerVigia);
    clearTimeout(this.timerReconexao);
    clearTimeout(this.timerProximaMao);
    await this.transporte.parar();
  }

  // ---------- ações do próprio anfitrião ----------
  aceitar(id: string) {
    const p = this.pendentes.get(id);
    if (!p) return;
    this.pendentes.delete(id);
    const r = adicionarJogador(this.estado, p.id, p.nome);
    if (!r.validacao.ok) {
      this.enviarPara(p.id, 'ENTRADA_RECUSADA', { motivo: r.validacao.mensagem });
    } else {
      this.tokens.set(p.id, p.token);
      this.ultimoSinal.set(p.id, Date.now());
      this.estado = r.estado;
      this.enviarPara(p.id, 'ENTRADA_ACEITA', { estado: estadoPublico(this.estado) });
      this.difundir('JOGADOR_ENTROU', { estado: estadoPublico(this.estado) });
    }
    this.notificarPendentes();
    this.ev.aoMudarEstado(this.estado);
  }

  recusar(id: string) {
    if (!this.pendentes.delete(id)) return;
    this.enviarPara(id, 'ENTRADA_RECUSADA', { motivo: 'O anfitrião recusou a sua entrada.' });
    this.notificarPendentes();
  }

  iniciar() {
    const v = podeIniciar(this.estado);
    if (!v.ok) return this.ev.aoErro(v.mensagem);
    for (const id of [...this.pendentes.keys()]) this.recusar(id);
    this.estado = iniciarPartida(this.estado, this.rng);
    this.difundir('PARTIDA_INICIADA', { estado: estadoPublico(this.estado) });
    this.enviarMaos();
    this.ev.aoMudarEstado(this.estado);
  }

  jogar(carta: Carta) {
    this.processarJogada(this.eu.id, carta);
  }

  bater() {
    this.processarBater(this.eu.id);
  }

  /** Anfitrião sai: em sala apenas fecha; em jogo, cancela a partida para todos. */
  sair() {
    if (this.estado.fase === 'SALA') {
      this.estado = { ...this.estado, fase: 'CANCELADA', motivo: 'CANCELADA_PELO_ANFITRIAO', fim: new Date().toISOString() };
      this.difundir('PARTIDA_FINALIZADA', { estado: estadoPublico(this.estado) });
      return this.fechar();
    }
    if (!partidaEncerrada(this.estado)) this.encerrar('CANCELADA_PELO_ANFITRIAO');
    return this.fechar();
  }

  // ---------- recebimento ----------
  private receber(texto: string) {
    const m = interpretar(texto); // 1) valida o formato ANTES de tocar no estado
    if (!m || !TIPOS_DO_CONVIDADO.includes(m.tipo)) return;

    if (m.tipo === 'SOLICITACAO_ENTRADA') return this.aoSolicitar(m);

    // 2) só aceita quem se identificou na sala e apresenta o token correto
    const token = this.tokens.get(m.jogadorId);
    if (!token || token !== m.token) return this.enviarPara(m.jogadorId, 'ERRO', { codigo: 'NAO_AUTORIZADO', mensagem: 'Você não faz parte desta partida.' });
    // 3) descarta mensagens repetidas/antigas
    if (m.seq <= (this.ultimoSeq.get(m.jogadorId) ?? -1)) return;
    this.ultimoSeq.set(m.jogadorId, m.seq);
    this.ultimoSinal.set(m.jogadorId, Date.now());

    switch (m.tipo) {
      case 'JOGADA':
        return this.processarJogada(m.jogadorId, m.carta);
      case 'JOGADOR_COMPLETOU':
        return this.processarBater(m.jogadorId);
      case 'SAIDA':
        return this.aoSair(m.jogadorId);
      case 'RECONEXAO':
        return this.aoReconectar(m.jogadorId);
      default:
        return; // PING: só atualiza o sinal
    }
  }

  private aoSolicitar(m: Extract<Mensagem, { tipo: 'SOLICITACAO_ENTRADA' }>) {
    if (!m.token) return;
    const jaEsta = this.estado.jogadores.some((j) => j.id === m.jogadorId);
    if (jaEsta && this.tokens.get(m.jogadorId) === m.token) {
      return this.enviarPara(m.jogadorId, 'ENTRADA_ACEITA', { estado: estadoPublico(this.estado) }); // reenvio
    }
    if (this.estado.fase !== 'SALA' || jaEsta || this.estado.jogadores.length >= 6) {
      const motivo = this.estado.fase !== 'SALA' ? 'A partida já começou.' : 'A sala está cheia.';
      return this.enviarPara(m.jogadorId, 'ENTRADA_RECUSADA', { motivo });
    }
    this.pendentes.set(m.jogadorId, { id: m.jogadorId, nome: m.nome, token: m.token });
    this.notificarPendentes();
  }

  private aoSair(id: string) {
    if (this.estado.fase === 'SALA') {
      this.estado = removerJogadorDaSala(this.estado, id);
      this.tokens.delete(id);
      this.difundir('JOGADOR_SAIU', { estado: estadoPublico(this.estado) });
      this.ev.aoMudarEstado(this.estado);
    } else if (!partidaEncerrada(this.estado)) {
      this.encerrar('ABANDONO');
    }
  }

  // ---------- regras aplicadas ----------
  private processarJogada(id: string, carta: Carta) {
    const v = validarJogada(this.estado, id, carta);
    if (!v.ok) return this.rejeitar(id, v.codigo, v.mensagem);
    const { estado, troca } = aplicarJogada(this.estado, id, carta);
    this.estado = estado;
    this.difundir('TROCA_REALIZADA', { de: troca.de, para: troca.para, estado: estadoPublico(estado) });
    this.enviarMao(troca.de);
    this.enviarMao(troca.para);
    this.ev.aoMudarEstado(this.estado);
  }

  private processarBater(id: string) {
    const v = validarBater(this.estado, id);
    if (!v.ok) return this.rejeitar(id, v.codigo, v.mensagem);
    const r = aplicarBater(this.estado, id);
    this.estado = r.estado;
    // Neste tipo, jogadorId identifica QUEM completou (e não o remetente).
    this.difundir('JOGADOR_COMPLETOU', { estado: estadoPublico(r.estado) }, id);
    if (r.fimDeMao?.partidaTerminou) {
      this.difundir('PARTIDA_FINALIZADA', { estado: estadoPublico(r.estado) });
      this.finalizarNotificando();
    } else if (r.fimDeMao) {
      this.timerProximaMao = setTimeout(() => this.novaMao(), PAUSA_ENTRE_MAOS_MS);
    }
    this.ev.aoMudarEstado(this.estado);
  }

  private novaMao() {
    if (this.estado.fase !== 'FIM_MAO') return;
    this.estado = proximaMao(this.estado, this.rng);
    this.difundir('ESTADO_PARTIDA', { estado: estadoPublico(this.estado) });
    this.enviarMaos();
    this.ev.aoMudarEstado(this.estado);
  }

  private encerrar(motivo: MotivoFim) {
    this.estado = finalizar(this.estado, motivo);
    this.difundir('PARTIDA_FINALIZADA', { estado: estadoPublico(this.estado) });
    this.finalizarNotificando();
    this.ev.aoMudarEstado(this.estado);
  }

  private finalizarNotificando() {
    clearTimeout(this.timerReconexao);
    clearTimeout(this.timerProximaMao);
    if (this.encerradaNotificada) return;
    this.encerradaNotificada = true;
    this.ev.aoEncerrar(this.estado);
  }

  // ---------- conexão ----------
  private vigiar() {
    if (partidaEncerrada(this.estado)) return;
    const agora = Date.now();
    for (const j of this.estado.jogadores) {
      if (j.anfitriao || !j.conectado) continue;
      if (agora - (this.ultimoSinal.get(j.id) ?? agora) > TEMPO_SEM_SINAL_MS) this.aoPerderJogador(j.id);
    }
  }

  private aoPerderJogador(id: string) {
    if (this.estado.fase === 'SALA') return this.aoSair(id);
    this.estado = marcarConexao(this.estado, id, false);
    this.difundir('JOGADOR_DESCONECTADO', { estado: estadoPublico(this.estado) }, id);
    clearTimeout(this.timerReconexao);
    this.timerReconexao = setTimeout(() => {
      if (this.estado.jogadores.some((j) => !j.conectado) && !partidaEncerrada(this.estado)) this.encerrar('DESCONEXAO');
    }, TEMPO_RECONEXAO_MS);
    this.ev.aoMudarEstado(this.estado);
  }

  private aoReconectar(id: string) {
    if (partidaEncerrada(this.estado)) return this.enviarPara(id, 'ESTADO_PARTIDA', { estado: estadoPublico(this.estado) });
    this.estado = marcarConexao(this.estado, id, true);
    if (!this.estado.jogadores.some((j) => !j.conectado)) clearTimeout(this.timerReconexao);
    this.difundir('ESTADO_PARTIDA', { estado: estadoPublico(this.estado) });
    this.enviarMao(id);
    this.ev.aoMudarEstado(this.estado);
  }

  // ---------- envio ----------
  private notificarPendentes() {
    this.ev.aoSolicitarEntrada([...this.pendentes.values()].map(({ id, nome }) => ({ id, nome })));
  }

  private rejeitar(id: string, codigo: string, mensagem: string) {
    if (id === this.eu.id) this.ev.aoErro(mensagem);
    else this.enviarPara(id, 'ERRO', { codigo, mensagem });
  }

  /** Cada jogador recebe SÓ a própria mão (destinatarioId). O anfitrião lê a dele direto do estado. */
  private enviarMao(id: string) {
    if (id === this.eu.id) return;
    this.enviarPara(id, 'MAO_ATUALIZADA', { mao: this.estado.maos[id] ?? [] });
  }
  private enviarMaos() {
    this.estado.jogadores.forEach((j) => this.enviarMao(j.id));
  }

  private montar<T extends TipoMensagem>(tipo: T, extras: CamposExtras<T>, jogadorId = this.eu.id, destinatarioId?: string): string {
    return serializar({ tipo, partidaId: this.estado.id, jogadorId, seq: this.seq++, destinatarioId, ...extras } as unknown as Mensagem);
  }

  private difundir<T extends TipoMensagem>(tipo: T, extras: CamposExtras<T>, jogadorId?: string) {
    this.transporte.enviar(this.montar(tipo, extras, jogadorId)).catch((e) => this.ev.aoErro(`Falha ao enviar: ${e.message ?? e}`));
  }

  private enviarPara<T extends TipoMensagem>(destino: string, tipo: T, extras: CamposExtras<T>) {
    this.transporte.enviar(this.montar(tipo, extras, this.eu.id, destino)).catch((e) => this.ev.aoErro(`Falha ao enviar: ${e.message ?? e}`));
  }
}
