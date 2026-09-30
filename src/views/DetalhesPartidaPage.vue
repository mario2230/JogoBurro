<script setup lang="ts">
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import LetrasBurro from '@/components/LetrasBurro.vue';
import { resultadoLocal } from '@/domain/historico';
import type { RegistroPartida } from '@/domain/types';
import { useJogo } from '@/stores/jogo';
import { confirmar, duracao, formatarData, rotuloMotivo, rotuloStatus } from '@/utils/util';

const jogo = useJogo();
const route = useRoute();
const router = useRouter();
const p = ref<RegistroPartida | null>(null);
const naoEncontrada = ref(false);

onIonViewWillEnter(async () => {
  p.value = await jogo.obterPartida(String(route.params.id));
  naoEncontrada.value = !p.value;
});

const nomeDe = (id: string | null) => p.value?.participantes.find((x) => x.id === id)?.nome ?? '—';
const rotuloLocal = { VENCEDOR: 'Você venceu', PENALIZADO: 'Você foi o burro', PARTICIPOU: 'Você participou' };

async function excluir() {
  if (!p.value || !(await confirmar('Excluir partida?', 'Ela será apagada do histórico.', 'Excluir'))) return;
  await jogo.excluirPartida(p.value.id);
  router.back();
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/historico" text="Histórico" /></ion-buttons>
        <ion-title>Detalhes da partida</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina">
        <p v-if="naoEncontrada" class="cartao">Esta partida não está mais no histórico.</p>
        <template v-if="p">
          <div class="cartao">
            <p><strong>{{ rotuloStatus[p.status] }}</strong> — {{ rotuloMotivo[p.motivo] }}</p>
            <p>Início: {{ formatarData(p.inicio) }}</p>
            <p>Término: {{ formatarData(p.fim) }} ({{ duracao(p.inicio, p.fim) }})</p>
            <p>{{ p.maos }} mãos · {{ p.rodadas }} rodadas</p>
          </div>
          <div class="cartao">
            <p>Vencedor: <strong>{{ nomeDe(p.vencedorId) }}</strong></p>
            <p>Penalizado: <strong>{{ nomeDe(p.penalizadoId) }}</strong></p>
            <p class="suave">{{ rotuloLocal[resultadoLocal(p)] }}</p>
          </div>
          <h2>Ordem dos jogadores</h2>
          <div v-for="x in p.participantes" :key="x.id" class="cartao linha">
            <span>{{ x.posicao }}. {{ x.nome }}<span v-if="x.id === p.jogadorLocalId" class="suave"> (você)</span></span>
            <LetrasBurro :letras="x.letras" pequeno />
          </div>
          <ion-button expand="block" fill="outline" color="danger" @click="excluir">Excluir esta partida</ion-button>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.linha {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
