import { Remontador } from '@/domain/fragmentador';
import { RX_UUID, SERVICE_UUID, TX_UUID } from './constantes';
import { bytesAleatorio, FilaEnvio } from './fila-envio';
import type { TransporteAnfitriao } from './transporte';

/**
 * Papel PERIPHERAL (servidor GATT). O plugin @capacitor-community/bluetooth-le só implementa o
 * papel central, então o anfitrião usa o plugin Cordova `cordova-plugin-ble-peripheral`
 * (acessível em window.blePeripheral, funciona no Capacitor).
 *
 * Serviço com 2 características:
 *  - RX (WRITE): os convidados escrevem aqui
 *  - TX (NOTIFY): o anfitrião publica aqui; todos os convidados inscritos recebem
 */
const bp = (): any => {
  const p = (window as any).blePeripheral;
  if (!p) throw new Error('Plugin cordova-plugin-ble-peripheral não encontrado. Rode "npx cap sync" e reinstale o app.');
  return p;
};

/** O valor pode chegar como ArrayBuffer, array de números ou base64, conforme a versão da ponte. */
function paraBytes(v: unknown): Uint8Array {
  if (v instanceof ArrayBuffer) return new Uint8Array(v);
  if (ArrayBuffer.isView(v)) return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  if (Array.isArray(v)) return Uint8Array.from(v);
  if (typeof v === 'string') return Uint8Array.from(atob(v), (c) => c.charCodeAt(0));
  return new Uint8Array();
}

const semTraco = (u: string) => u.toLowerCase();

export class BleAnfitriao implements TransporteAnfitriao {
  private cb: (texto: string) => void = () => undefined;
  private remontador = new Remontador();
  private fila = new FilaEnvio(bytesAleatorio(), async (pacote) => {
    const buf = pacote.buffer.slice(pacote.byteOffset, pacote.byteOffset + pacote.byteLength);
    await bp().setCharacteristicValue(SERVICE_UUID, TX_UUID, buf);
  });

  aoReceber(cb: (texto: string) => void) {
    this.cb = cb;
  }

  async iniciar(nomeVisivel: string) {
    const p = bp();
    await p.createService(SERVICE_UUID);
    await p.addCharacteristic(SERVICE_UUID, RX_UUID, p.properties.WRITE | p.properties.WRITE_NO_RESPONSE, p.permissions.WRITEABLE);
    await p.addCharacteristic(SERVICE_UUID, TX_UUID, p.properties.READ | p.properties.NOTIFY, p.permissions.READABLE);
    await p.publishService(SERVICE_UUID);
    p.onWriteRequest((req: { characteristic: string; value: unknown }) => {
      if (semTraco(req.characteristic) !== semTraco(RX_UUID)) return;
      const texto = this.remontador.receber(paraBytes(req.value));
      if (texto !== null) this.cb(texto);
    });
    await p.startAdvertising(SERVICE_UUID, nomeVisivel);
  }

  async parar() {
    try {
      await bp().stopAdvertising();
    } catch {
      /* já parado */
    }
  }

  enviar(texto: string) {
    return this.fila.enviar(texto);
  }
}
