import { interpretar, serializar, type Mensagem, type TipoMensagem } from '@/domain/protocolo';
import { partidaEncerrada } from '@/domain/regras';
import type { Carta, EstadoPublico } from '@/domain/types';
import { gerarId } from '@/domain/ids';
import type { TransporteConvidado } from './bluetooth';

export type StatusConexao = 'DESCONECTADO' | 'CONECTANDO' | 'AGUARDANDO_ANFITRIAO' | 'CONECTADO' | 'RECONECTANDO';

export interface EventosConvidado {
  aoMudarStatus(s: StatusConexao): void;
  aoEstado(e: EstadoPublico): void;
  aoMao(mao: Carta[]): void;
  aoErro(mensagem: string): void;
  /** Partida terminou (normal ou por falha). `estado` é o último conhecido. */
  aoEncerrar(estado: EstadoPublico | null, motivo: 'PARTIDA' | 'CONEXAO_PERDIDA'): void;
}

type Extras<T extends TipoMensagem> = Omit<Extract<Mensagem, { tipo: T }>, 'tipo' | 'partidaId' | 'jogadorId' | 'seq' | 'token' | 'destinatarioId'>;

const TENTATIVAS_RECONEXAO = 5;
const TIMEOUT_ACEITE_MS = 60_000; // o anfitrião precisa aceitar manualmente

export class SessaoConvidado {
  private token = gerarId(12);
  private seq = 0;
  private partidaId = '';
  private ultimoSeqAnfitriao = -1;
  private deviceId = '';
  private ultimoEstado: EstadoPublico | null = null;
  private saiu = false;
  private status: StatusConexao = 'DESCONECTADO';
  private ping?: ReturnType<typeof setInterval>;
  private esperandoAceite?: { ok: () => void; falha: (m: string) => void };
  private esperandoEstado?: () => void;

  constructor(private transporte: TransporteConvidado, private eu: { id: string; nome: string }, private ev: EventosConvidado) {}

  private mudar(s: StatusConexao) {
    this.status = s;
    this.ev.aoMudarStatus(s);
  }

  /** Conecta ao anfitrião e pede entrada. Resolve quando o anfitrião aceita; rejeita se recusar. */
  async entrar(deviceId: string) {
    this.deviceId = deviceId;
    this.transporte.aoReceber((t) => this.receber(t));
    this.mudar('CONECTANDO');
    try {
      await this.transporte.conectar(deviceId, () => this.aoPerderConexao());
    } catch (e: any) {
      this.mudar('DESCONECTADO');
      throw new Error(`Não foi possível conectar ao anfitrião. ${e?.message ?? ''}`.trim());
    }
    this.mudar('AGUARDANDO_ANFITRIAO');
    const resposta = new Promise<void>((ok, falha) => {
      const t = setTimeout(() => falha(new Error('O anfitrião não respondeu a tempo.')), TIMEOUT_ACEITE_MS);
      this.esperandoAceite = {
        ok: () => (clearTimeout(t), ok()),
        falha: (m) => (clearTimeout(t), falha(new Error(m))),
      };
    });
    await this.enviar('SOLICITACAO_ENTRADA', { nome: this.eu.nome });
    try {
      await resposta;
    } catch (e) {
      await this.transporte.desconectar();
      this.mudar('DESCONECTADO');
      throw e;
    }
    this.mudar('CONECTADO');
    this.ping = setInterval(() => this.status === 'CONECTADO' && this.enviar('PING', {}).catch(() => undefined), 5000);
  }

  jogar(carta: Carta) {
    return this.enviar('JOGADA', { carta });
  }
  bater() {
    return this.enviar('JOGADOR_COMPLETOU', {});
  }

  async sair() {
    this.saiu = true;
    clearInterval(this.ping);
    try {
      await this.enviar('SAIDA', {});
    } catch {
      /* já sem conexão */
    }
    await this.transporte.desconectar();
    this.mudar('DESCONECTADO');
  }

  // ---------- recebimento ----------
  private receber(texto: string) {
    const m = interpretar(texto);
    if (!m) return;
    if (m.destinatarioId && m.destinatarioId !== this.eu.id) return; // mensagem privada de outro jogador
    if (this.partidaId && m.partidaId && m.partidaId !== this.partidaId) return;
    if (m.seq <= this.ultimoSeqAnfitriao) return;
    this.ultimoSeqAnfitriao = m.seq;

    switch (m.tipo) {
      case 'ENTRADA_ACEITA':
        this.partidaId = m.partidaId;
        this.esperandoAceite?.ok();
        return this.novoEstado(m.estado);
      case 'ENTRADA_RECUSADA':
        return this.esperandoAceite?.falha(m.motivo);
      case 'MAO_ATUALIZADA':
        return this.ev.aoMao(m.mao);
      case 'ERRO':
        return this.ev.aoErro(m.mensagem);
      case 'ESTADO_PARTIDA':
        this.esperandoEstado?.();
        return this.novoEstado(m.estado);
      case 'PARTIDA_FINALIZADA':
        this.novoEstado(m.estado);
        return this.encerrar();
      case 'JOGADOR_ENTROU':
      case 'JOGADOR_SAIU':
      case 'JOGADOR_DESCONECTADO':
      case 'PARTIDA_INICIADA':
      case 'TROCA_REALIZADA':
        return this.novoEstado(m.estado);
      case 'JOGADOR_COMPLETOU':
        if (m.estado) this.novoEstado(m.estado);
        return;
      default:
        return;
    }
  }

  private novoEstado(e: EstadoPublico) {
    this.ultimoEstado = e;
    this.ev.aoEstado(e);
    if (partidaEncerrada(e)) this.encerrar();
  }

  private encerrar() {
    if (this.saiu) return;
    this.saiu = true;
    clearInterval(this.ping);
    this.transporte.desconectar().catch(() => undefined);
    this.mudar('DESCONECTADO');
    this.ev.aoEncerrar(this.ultimoEstado, 'PARTIDA');
  }

  // ---------- conexão perdida e reconexão ----------
  private async aoPerderConexao() {
    if (this.saiu || this.status === 'RECONECTANDO') return;
    if (this.status !== 'CONECTADO') return; // durante a entrada, o erro sobe pelo entrar()
    this.mudar('RECONECTANDO');
    for (let i = 1; i <= TENTATIVAS_RECONEXAO && !this.saiu; i++) {
      try {
        await this.transporte.conectar(this.deviceId, () => this.aoPerderConexao());
        const voltou = new Promise<void>((ok, falha) => {
          const t = setTimeout(() => falha(new Error('sem resposta')), 8000);
          this.esperandoEstado = () => (clearTimeout(t), ok());
        });
        await this.enviar('RECONEXAO', {});
        await voltou;
        this.mudar('CONECTADO');
        return;
      } catch {
        await this.transporte.desconectar().catch(() => undefined);
        await new Promise((r) => setTimeout(r, 2000 * i));
      }
    }
    if (this.saiu) return;
    this.saiu = true;
    clearInterval(this.ping);
    this.mudar('DESCONECTADO');
    this.ev.aoErro('A conexão com o anfitrião foi perdida e não foi possível reconectar. A partida foi interrompida.');
    this.ev.aoEncerrar(this.ultimoEstado, 'CONEXAO_PERDIDA');
  }

  // ---------- envio ----------
  private enviar<T extends TipoMensagem>(tipo: T, extras: Extras<T>) {
    const m = { tipo, partidaId: this.partidaId, jogadorId: this.eu.id, seq: this.seq++, token: this.token, ...extras } as unknown as Mensagem;
    return this.transporte.enviar(serializar(m));
  }
}
