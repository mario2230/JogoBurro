import { BleClient } from '@capacitor-community/bluetooth-le';
import { Remontador } from '@/domain/fragmentador';
import { RX_UUID, SERVICE_UUID, TX_UUID } from './constantes';
import { bytesAleatorio, FilaEnvio } from './fila-envio';
import type { Anuncio, TransporteConvidado } from './transporte';

/** Papel CENTRAL: procura o serviço do jogo, conecta e troca mensagens com o anfitrião. */
export class BleConvidado implements TransporteConvidado {
  private cb: (texto: string) => void = () => undefined;
  private remontador = new Remontador();
  private deviceId: string | null = null;
  private fila = new FilaEnvio(bytesAleatorio(), async (pacote) => {
    if (!this.deviceId) throw new Error('Sem conexão com o anfitrião.');
    const dv = new DataView(pacote.buffer.slice(pacote.byteOffset, pacote.byteOffset + pacote.byteLength));
    await BleClient.write(this.deviceId, SERVICE_UUID, RX_UUID, dv);
  });

  aoReceber(cb: (texto: string) => void) {
    this.cb = cb;
  }

  async procurar(cb: (a: Anuncio) => void) {
    await BleClient.requestLEScan({ services: [SERVICE_UUID], allowDuplicates: false }, (r) => {
      cb({ deviceId: r.device.deviceId, nome: r.localName ?? r.device.name ?? 'Partida de Burro' });
    });
  }

  async pararBusca() {
    try {
      await BleClient.stopLEScan();
    } catch {
      /* já parada */
    }
  }

  async conectar(deviceId: string, aoDesconectar: () => void) {
    await BleClient.connect(deviceId, () => aoDesconectar(), { timeout: 10_000 });
    this.deviceId = deviceId;
    await new Promise((r) => setTimeout(r, 300)); // dá tempo do Android terminar a descoberta de serviços
    await BleClient.startNotifications(deviceId, SERVICE_UUID, TX_UUID, (valor) => {
      const texto = this.remontador.receber(new Uint8Array(valor.buffer, valor.byteOffset, valor.byteLength));
      if (texto !== null) this.cb(texto);
    });
  }

  async desconectar() {
    const id = this.deviceId;
    this.deviceId = null;
    if (!id) return;
    try {
      await BleClient.disconnect(id);
    } catch {
      /* já desconectado */
    }
  }

  enviar(texto: string) {
    return this.fila.enviar(texto);
  }
}
