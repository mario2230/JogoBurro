import { BleClient } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

export class ErroBluetooth extends Error {
  constructor(public codigo: 'PERMISSAO_NEGADA' | 'BLUETOOTH_DESLIGADO' | 'INDISPONIVEL', mensagem: string) {
    super(mensagem);
  }
}

type PermissoesAndroid = {
  checkPermission: (permissao: string, sucesso: (estado: { hasPermission: boolean }) => void, falha: () => void) => void;
  requestPermission: (permissao: string, sucesso: (estado: { hasPermission: boolean }) => void, falha: () => void) => void;
};

/** Android 12+: o anfitrião precisa pedir autorização para anunciar a sala. */
function pedirPermissaoAndroid(permissao: string): Promise<boolean> {
  const perms = (window as any).cordova?.plugins?.permissions as PermissoesAndroid | undefined;
  if (!perms) throw new Error('Plugin de permissões Android não encontrado. Sincronize e reinstale o app.');

  return new Promise((resolve, reject) => {
    perms.checkPermission(permissao, (estado) => {
      if (estado.hasPermission) return resolve(true);
      perms.requestPermission(permissao, (resultado) => resolve(resultado.hasPermission), () => reject(new Error('Falha ao solicitar a permissão de Bluetooth.')));
    }, () => reject(new Error('Falha ao verificar a permissão de Bluetooth.')));
  });
}

function mensagemDe(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}

/** Solicita as permissões BLE sem ligar o rádio. */
export async function solicitarPermissoesBluetooth(papel: 'anfitriao' | 'convidado' = 'convidado'): Promise<void> {
  if (!Capacitor.isNativePlatform()) return; // navegador: usa o simulador
  try {
    await BleClient.initialize({ androidNeverForLocation: true });
  } catch (erro) {
    const detalhe = mensagemDe(erro);
    if (/unsupported|not supported|BLE is not supported/i.test(detalhe)) {
      throw new ErroBluetooth('INDISPONIVEL', 'Este aparelho não oferece Bluetooth Low Energy.');
    }
    throw new ErroBluetooth('PERMISSAO_NEGADA', 'Permita “Dispositivos próximos” nas permissões do app para buscar partidas.');
  }

  if (papel === 'anfitriao' && Capacitor.getPlatform() === 'android') {
    let ok: boolean;
    try {
      ok = await pedirPermissaoAndroid('android.permission.BLUETOOTH_ADVERTISE');
    } catch (erro) {
      throw new ErroBluetooth('INDISPONIVEL', `Não foi possível solicitar a permissão para anunciar a partida. ${mensagemDe(erro)}`);
    }
    if (!ok) throw new ErroBluetooth('PERMISSAO_NEGADA', 'Permita “Dispositivos próximos” para anunciar a partida aos outros jogadores.');
  }
}

/** Pede permissões e confirma que o Bluetooth está ligado. Lança ErroBluetooth com mensagem clara. */
export async function garantirBluetooth(papel: 'anfitriao' | 'convidado'): Promise<void> {
  await solicitarPermissoesBluetooth(papel);
  if (!Capacitor.isNativePlatform()) return;

  let ligado = await BleClient.isEnabled();
  if (!ligado && Capacitor.getPlatform() === 'android') {
    try {
      await BleClient.enable();
      ligado = await BleClient.isEnabled();
    } catch {
      /* usuário recusou */
    }
  }
  if (!ligado) throw new ErroBluetooth('BLUETOOTH_DESLIGADO', 'O Bluetooth está desligado. Ligue-o e tente de novo.');
}
