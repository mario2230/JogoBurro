import { fragmentar } from '@/domain/fragmentador';
import { INTERVALO_ENTRE_PACOTES_MS } from './constantes';

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Serializa os envios (um texto por vez) e espaça os pacotes para não estourar o buffer do BLE. */
export class FilaEnvio {
  private fila: Promise<void> = Promise.resolve();
  private msgId = 0;

  constructor(private tag: number, private escrever: (pacote: Uint8Array) => Promise<void>) {}

  enviar(texto: string): Promise<void> {
    const id = this.msgId++ & 0xff;
    const tarefa = this.fila.then(async () => {
      for (const pacote of fragmentar(texto, this.tag, id)) {
        await this.escrever(pacote);
        await esperar(INTERVALO_ENTRE_PACOTES_MS);
      }
    });
    this.fila = tarefa.catch(() => undefined); // um erro não trava os próximos envios
    return tarefa;
  }
}

export const bytesAleatorio = () => crypto.getRandomValues(new Uint8Array(1))[0];
