import type { Anuncio, TransporteAnfitriao, TransporteConvidado } from './transporte';

/**
 * Simulador para desenvolver no navegador SEM Bluetooth: abas do mesmo navegador conversam por
 * BroadcastChannel. Abra o app em várias abas: uma cria a partida, as outras procuram.
 * (Não passa pela fragmentação; serve para testar telas e regras.)
 */
type Pacote =
  | { k: 'busca' }
  | { k: 'anuncio'; hostId: string; nome: string }
  | { k: 'g2h'; hostId: string; texto: string }
  | { k: 'h2g'; hostId: string; texto: string };

const canal = () => new BroadcastChannel('burro-simulador');
const idAba = () => Math.random().toString(36).slice(2, 10);

export class SimuladorAnfitriao implements TransporteAnfitriao {
  private ch = canal();
  private hostId = idAba();
  private cb: (t: string) => void = () => undefined;
  private nome = '';

  aoReceber(cb: (t: string) => void) {
    this.cb = cb;
  }
  async iniciar(nomeVisivel: string) {
    this.nome = nomeVisivel;
    this.ch.onmessage = (e: MessageEvent<Pacote>) => {
      const p = e.data;
      if (p.k === 'busca') this.ch.postMessage({ k: 'anuncio', hostId: this.hostId, nome: this.nome } satisfies Pacote);
      if (p.k === 'g2h' && p.hostId === this.hostId) this.cb(p.texto);
    };
    this.ch.postMessage({ k: 'anuncio', hostId: this.hostId, nome: this.nome } satisfies Pacote);
  }
  async parar() {
    this.ch.close();
  }
  async enviar(texto: string) {
    this.ch.postMessage({ k: 'h2g', hostId: this.hostId, texto } satisfies Pacote);
  }
}

export class SimuladorConvidado implements TransporteConvidado {
  private ch = canal();
  private hostId: string | null = null;
  private cb: (t: string) => void = () => undefined;

  aoReceber(cb: (t: string) => void) {
    this.cb = cb;
  }
  async procurar(cb: (a: Anuncio) => void) {
    this.ch.onmessage = (e: MessageEvent<Pacote>) => {
      const p = e.data;
      if (p.k === 'anuncio') cb({ deviceId: p.hostId, nome: p.nome });
      if (p.k === 'h2g' && p.hostId === this.hostId) this.cb(p.texto);
    };
    this.ch.postMessage({ k: 'busca' } satisfies Pacote);
  }
  async pararBusca() {
    /* mantém o canal aberto para receber mensagens */
  }
  async conectar(deviceId: string) {
    this.hostId = deviceId;
  }
  async desconectar() {
    this.hostId = null;
  }
  async enviar(texto: string) {
    if (!this.hostId) throw new Error('Sem conexão com o anfitrião.');
    this.ch.postMessage({ k: 'g2h', hostId: this.hostId, texto } satisfies Pacote);
  }
}
