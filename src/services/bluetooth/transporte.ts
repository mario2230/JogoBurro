/** Abstração do meio de comunicação. O jogo não sabe se é BLE ou o simulador de navegador. */
export interface Anuncio {
  deviceId: string;
  nome: string;
}

export interface TransporteAnfitriao {
  iniciar(nomeVisivel: string): Promise<void>;
  parar(): Promise<void>;
  /** Envia a todos os convidados conectados. */
  enviar(texto: string): Promise<void>;
  aoReceber(cb: (texto: string) => void): void;
}

export interface TransporteConvidado {
  procurar(cb: (a: Anuncio) => void): Promise<void>;
  pararBusca(): Promise<void>;
  conectar(deviceId: string, aoDesconectar: () => void): Promise<void>;
  desconectar(): Promise<void>;
  enviar(texto: string): Promise<void>;
  aoReceber(cb: (texto: string) => void): void;
}
