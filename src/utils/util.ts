import { alertController } from '@ionic/vue';

/** Diálogo de confirmação para ações importantes (sair da partida, apagar histórico). */
export async function confirmar(titulo: string, mensagem: string, textoOk = 'Confirmar'): Promise<boolean> {
  const alerta = await alertController.create({
    header: titulo,
    message: mensagem,
    buttons: [
      { text: 'Voltar', role: 'cancel' },
      { text: textoOk, role: 'confirm', cssClass: 'botao-perigo' },
    ],
  });
  await alerta.present();
  const { role } = await alerta.onDidDismiss();
  return role === 'confirm';
}

export async function avisar(titulo: string, mensagem: string) {
  const alerta = await alertController.create({ header: titulo, message: mensagem, buttons: ['Ok'] });
  await alerta.present();
}

export const formatarData = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function duracao(inicio: string, fim: string) {
  const s = Math.max(0, Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 1000));
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
}

export const rotuloStatus: Record<string, string> = { FINALIZADA: 'Finalizada', CANCELADA: 'Cancelada', INTERROMPIDA: 'Interrompida' };
export const rotuloMotivo: Record<string, string> = {
  VITORIA: 'Alguém completou BURRO',
  ABANDONO: 'Um jogador abandonou a partida',
  DESCONEXAO: 'Um jogador desconectou',
  CANCELADA_PELO_ANFITRIAO: 'O anfitrião cancelou a partida',
};
