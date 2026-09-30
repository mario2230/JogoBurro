<script setup lang="ts">
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonSpinner, IonTitle, IonToolbar, onIonViewWillEnter,
} from '@ionic/vue';
import { trashOutline } from 'ionicons/icons';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { resultadoLocal } from '@/domain/historico';
import type { RegistroPartida } from '@/domain/types';
import { useJogo } from '@/stores/jogo';
import { confirmar, formatarData, rotuloStatus } from '@/utils/util';

const jogo = useJogo();
const router = useRouter();
const partidas = ref<RegistroPartida[]>([]);
const carregando = ref(true);

async function carregar() {
  carregando.value = true;
  try {
    partidas.value = await jogo.listarHistorico();
  } catch (e: any) {
    jogo.notificar(`Não foi possível ler o histórico: ${e?.message ?? e}`, 'erro');
  } finally {
    carregando.value = false;
  }
}
onIonViewWillEnter(carregar);

const nomeDe = (p: RegistroPartida, id: string | null) => p.participantes.find((x) => x.id === id)?.nome ?? '—';
const rotuloLocal = { VENCEDOR: 'Você venceu', PENALIZADO: 'Você foi o burro', PARTICIPOU: 'Você participou' };

async function excluir(p: RegistroPartida) {
  if (!(await confirmar('Excluir partida?', `A partida de ${formatarData(p.inicio)} será apagada do histórico.`, 'Excluir'))) return;
  await jogo.excluirPartida(p.id);
  await carregar();
}
async function limpar() {
  if (!(await confirmar('Limpar histórico?', 'Todas as partidas salvas neste aparelho serão apagadas.', 'Apagar tudo'))) return;
  await jogo.limparHistorico();
  await carregar();
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/inicio" text="Voltar" /></ion-buttons>
        <ion-title>Histórico</ion-title>
        <ion-buttons slot="end"><ion-button v-if="partidas.length" @click="limpar">Limpar</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina">
        <div v-if="carregando" style="text-align: center"><ion-spinner name="dots" /></div>
        <div v-else-if="!partidas.length" class="cartao">
          <strong>Nenhuma partida ainda</strong>
          <p class="suave">As partidas terminam aqui automaticamente, mesmo as canceladas ou interrompidas.</p>
          <ion-button @click="router.push('/partida')">Jogar agora</ion-button>
        </div>
        <div v-for="p in partidas" :key="p.id" class="cartao item">
          <button class="corpo" @click="router.push(`/historico/${p.id}`)">
            <strong>{{ formatarData(p.inicio) }}</strong>
            <span class="suave">{{ rotuloStatus[p.status] }} · {{ p.participantes.length }} jogadores</span>
            <span class="suave">{{ p.participantes.map((x) => x.nome).join(', ') }}</span>
            <span>Vencedor: {{ nomeDe(p, p.vencedorId) }} · Burro: {{ nomeDe(p, p.penalizadoId) }}</span>
            <span class="local">{{ rotuloLocal[resultadoLocal(p)] }}</span>
          </button>
          <ion-button fill="clear" color="danger" :aria-label="`Excluir partida de ${formatarData(p.inicio)}`" @click="excluir(p)">
            <ion-icon slot="icon-only" :icon="trashOutline" />
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.corpo {
  flex: 1;
  display: grid;
  gap: 3px;
  text-align: left;
  background: none;
  border: 0;
  color: inherit;
  font: inherit;
  padding: 0;
}
.local {
  color: var(--mostarda);
  font-weight: 700;
}
</style>
