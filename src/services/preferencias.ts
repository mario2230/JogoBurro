import { Preferences } from '@capacitor/preferences';
import { gerarId } from '@/domain/ids';

export interface Perfil {
  id: string;
  nome: string;
}

const CHAVE = 'burro.perfil';

/** O id é gerado uma vez por instalação: é ele que permite a RECONEXAO na mesma partida. */
export async function carregarPerfil(): Promise<Perfil | null> {
  const { value } = await Preferences.get({ key: CHAVE });
  if (!value) return null;
  try {
    return JSON.parse(value) as Perfil;
  } catch {
    return null;
  }
}

export async function salvarNome(nome: string): Promise<Perfil> {
  const atual = await carregarPerfil();
  const perfil = { id: atual?.id ?? gerarId(), nome: nome.trim() };
  await Preferences.set({ key: CHAVE, value: JSON.stringify(perfil) });
  return perfil;
}
