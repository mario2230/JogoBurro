import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { defineStore } from 'pinia';
import { computed, markRaw, ref, shallowRef } from 'vue';
import { gerarId } from '@/domain/ids';
import { registroDe } from '@/domain/historico';
import { estadoPublico as estadoPublicoDe, partidaEncerrada, temQuadra } from '@/domain/regras';
import type { Carta, EstadoPartida, EstadoPublico, RegistroPartida } from '@/domain/types';
import { carregarPerfil, salvarNome, type Perfil } from '@/services/preferencias';
import { repositorio } from '@/services/repositorio';
import { criarTransporteAnfitriao, criarTransporteConvidado, garantirBluetooth, solicitarPermissoesBluetooth, type Anuncio } from '@/services/bluetooth';
import { SessaoAnfitriao } from '@/services/sessao-anfitriao';
import { SessaoConvidado, type StatusConexao } from '@/services/sessao-convidado';

async function vibrar(forte = false) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style: forte ? ImpactStyle.Heavy : ImpactStyle.Medium });
  } catch {
    /* sem vibração disponível */
  }
}

export const useJogo = defineStore('jogo', () => {
  const perfil = ref<Perfil | null>(null);
  const papel = ref<'anfitriao' | 'convidado' | null>(null);
  const estado = ref<EstadoPublico | null>(null);
  const minhaMao = ref<Carta[]>([]);
  const status = ref<StatusConexao>('DESCONECTADO');
  const pendentes = ref<{ id: string; nome: string }[]>([]);
  const aviso = ref<{ id: number; texto: string; tipo: 'erro' | 'info' } | null>(null);
  const ocupado = ref(false);
  const sessaoAnf = shallowRef<SessaoAnfitriao | null>(null);
  const sessaoConv = shallowRef<SessaoConvidado | null>(null);
  const salvas = new Set<string>();

  // ---------- derivados ----------
  const euId = computed(() => perfil.value?.id ?? '');
  const jogadorDaVez = computed(() => (estado.value ? estado.value.jogadores[estado.value.vez] : null));
  const minhaVez = computed(
    () => !!estado.value && estado.value.fase === 'JOGANDO' && !estado.value.pausada && jogadorDaVez.value?.id === euId.value,
  );
  const jogadorRelativo = (delta: number) => {
    const e = estado.value;
    if (!e) return null;
    const i = e.jogadores.findIndex((j) => j.id === euId.value);
    return e.jogadores[(i + delta + e.jogadores.length) % e.jogadores.length];
  };
  const proximo = computed(() => jogadorRelativo(1)); // para quem eu envio
  const anterior = computed(() => jogadorRelativo(-1)); // de quem eu recebo
  const podeBater = computed(() => {
    const e = estado.value;
    if (!e || e.pausada) return false;
    if (e.ordemBatida.includes(euId.value)) return false;
    return (e.fase === 'JOGANDO' && temQuadra(minhaMao.value)) || e.fase === 'BATIDA';
  });
  const souAnfitriao = computed(() => papel.value === 'anfitriao');

  // ---------- utilidades ----------
  function notificar(texto: string, tipo: 'erro' | 'info' = 'info') {
    aviso.value = { id: Date.now() + Math.random(), texto, tipo };
  }

  async function persistir(e: EstadoPublico) {
    if (!perfil.value || salvas.has(e.id) || e.numeroMao === 0) return; // partida que nunca começou não vai ao histórico
    salvas.add(e.id);
    try {
      await repositorio.salvar(registroDe(e, perfil.value.id));
    } catch (err: any) {
      notificar(`Não foi possível salvar no histórico: ${err?.message ?? err}`, 'erro');
    }
  }

  function comentarMudancas(antes: EstadoPublico | null, depois: EstadoPublico) {
    if (!antes) return;
    for (const j of depois.jogadores) {
      const a = antes.jogadores.find((x) => x.id === j.id);
      if (!a && antes.fase === 'SALA' && j.id !== euId.value) notificar(`${j.nome} entrou na sala.`);
      if (a && a.conectado && !j.conectado) notificar(`${j.nome} desconectou. Aguardando reconexão…`, 'erro');
      if (a && !a.conectado && j.conectado) notificar(`${j.nome} reconectou.`);
    }
    for (const a of antes.jogadores) {
      if (antes.fase === 'SALA' && !depois.jogadores.some((j) => j.id === a.id)) notificar(`${a.nome} saiu da sala.`);
    }
  }

  function aplicarEstado(novo: EstadoPublico) {
    const antes = estado.value;
    comentarMudancas(antes, novo);
    const eraMinhaVez = minhaVez.value;
    estado.value = novo;
    if (!eraMinhaVez && minhaVez.value) vibrar();
    if (partidaEncerrada(novo)) persistir(novo);
  }

  // ---------- perfil ----------
  async function iniciarApp() {
    perfil.value = await carregarPerfil();
  }
  async function prepararBluetoothNoInicio() {
    try {
      await solicitarPermissoesBluetooth('anfitriao');
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      notificar(`Permissão Bluetooth não concedida. Você pode permitir ao procurar ou criar uma partida. ${mensagem}`, 'erro');
    }
  }
  async function definirNome(nome: string) {
    perfil.value = await salvarNome(nome);
  }

  // ---------- anfitrião ----------
  async function criarPartida() {
    if (!perfil.value) throw new Error('Informe seu nome antes.');
    ocupado.value = true;
    try {
      await garantirBluetooth('anfitriao');
      const s = new SessaoAnfitriao(criarTransporteAnfitriao(), perfil.value, {
        aoMudarEstado: (e: EstadoPartida) => {
          aplicarEstado(markRaw(estadoPublicoDe(e)));
          minhaMao.value = e.maos[perfil.value!.id] ?? [];
        },
        aoSolicitarEntrada: (l) => {
          if (l.length > pendentes.value.length) vibrar();
          pendentes.value = l;
        },
        aoErro: (m) => notificar(m, 'erro'),
        aoEncerrar: (e) => persistir(estadoPublicoDe(e)),
      }, gerarId());
      sessaoAnf.value = s;
      papel.value = 'anfitriao';
      await s.abrirSala();
      status.value = 'CONECTADO';
    } catch (e) {
      sessaoAnf.value = null;
      papel.value = null;
      throw e;
    } finally {
      ocupado.value = false;
    }
  }

  const aceitar = (id: string) => sessaoAnf.value?.aceitar(id);
  const recusar = (id: string) => sessaoAnf.value?.recusar(id);
  const iniciarPartida = () => sessaoAnf.value?.iniciar();

  // ---------- convidado ----------
  const transporteBusca = shallowRef<ReturnType<typeof criarTransporteConvidado> | null>(null);

  async function procurar(aoAchar: (a: Anuncio) => void) {
    await garantirBluetooth('convidado');
    const t = criarTransporteConvidado();
    transporteBusca.value = markRaw(t);
    await t.procurar(aoAchar);
  }
  async function pararBusca() {
    await transporteBusca.value?.pararBusca();
  }

  async function entrarEm(anuncio: Anuncio) {
    if (!perfil.value || !transporteBusca.value) throw new Error('Procure as partidas primeiro.');
    await pararBusca();
    const s = new SessaoConvidado(transporteBusca.value, perfil.value, {
      aoMudarStatus: (st) => (status.value = st),
      aoEstado: (e) => aplicarEstado(e),
      aoMao: (m) => {
        if (m.length > minhaMao.value.length && estado.value?.fase !== 'SALA') vibrar();
        minhaMao.value = m;
      },
      aoErro: (m) => notificar(m, 'erro'),
      aoEncerrar: (e, motivo) => {
        if (motivo === 'CONEXAO_PERDIDA' && e && !partidaEncerrada(e)) {
          const interrompido: EstadoPublico = { ...e, fase: 'INTERROMPIDA', motivo: 'DESCONEXAO', fim: new Date().toISOString(), pausada: false };
          estado.value = interrompido;
          persistir(interrompido);
        }
      },
    });
    sessaoConv.value = s;
    papel.value = 'convidado';
    try {
      await s.entrar(anuncio.deviceId);
    } catch (e) {
      sessaoConv.value = null;
      papel.value = null;
      throw e;
    }
  }

  // ---------- ações de jogo ----------
  async function jogar(carta: Carta) {
    if (!minhaVez.value) return notificar('Não é a sua vez.', 'erro');
    if (sessaoAnf.value) return sessaoAnf.value.jogar(carta);
    try {
      await sessaoConv.value?.jogar(carta);
    } catch (e: any) {
      notificar(`Falha ao enviar a jogada: ${e?.message ?? e}`, 'erro');
    }
  }

  async function bater() {
    if (sessaoAnf.value) return sessaoAnf.value.bater();
    try {
      await sessaoConv.value?.bater();
    } catch (e: any) {
      notificar(`Falha ao enviar: ${e?.message ?? e}`, 'erro');
    }
  }

  /** Sai da sala/partida. Chame só depois de o jogador confirmar. */
  async function sair() {
    const e = estado.value;
    if (sessaoAnf.value) {
      await sessaoAnf.value.sair();
    } else if (sessaoConv.value) {
      await sessaoConv.value.sair();
      if (e && e.numeroMao > 0 && !partidaEncerrada(e)) {
        await persistir({ ...e, fase: 'INTERROMPIDA', motivo: 'ABANDONO', fim: new Date().toISOString(), pausada: false });
      }
    }
    reiniciar();
  }

  function reiniciar() {
    sessaoAnf.value?.fechar();
    sessaoAnf.value = null;
    sessaoConv.value = null;
    transporteBusca.value = null;
    papel.value = null;
    estado.value = null;
    minhaMao.value = [];
    pendentes.value = [];
    status.value = 'DESCONECTADO';
  }

  // ---------- histórico ----------
  const listarHistorico = (): Promise<RegistroPartida[]> => repositorio.listar();
  const obterPartida = (id: string) => repositorio.obter(id);
  const excluirPartida = (id: string) => repositorio.excluir(id);
  const limparHistorico = () => repositorio.limpar();

  return {
    perfil, papel, estado, minhaMao, status, pendentes, aviso, ocupado,
    euId, minhaVez, jogadorDaVez, proximo, anterior, podeBater, souAnfitriao,
    iniciarApp, prepararBluetoothNoInicio, definirNome, criarPartida, aceitar, recusar, iniciarPartida,
    procurar, pararBusca, entrarEm, jogar, bater, sair, reiniciar,
    listarHistorico, obterPartida, excluirPartida, limparHistorico, notificar,
  };
});
