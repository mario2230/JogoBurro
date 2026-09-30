<script setup lang="ts">
import { IonButton, IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import LetrasBurro from '@/components/LetrasBurro.vue';
import { useJogo } from '@/stores/jogo';
import { rotuloMotivo } from '@/utils/util';

const jogo = useJogo();
const router = useRouter();
const e = computed(() => jogo.estado);
const nome = (id?: string) => e.value?.jogadores.find((j) => j.id === id)?.nome ?? '—';
const euVenci = computed(() => e.value?.vencedorId === jogo.euId);
const euPerdi = computed(() => e.value?.penalizadoId === jogo.euId);
const titulo = computed(() => {
  if (e.value?.fase === 'CANCELADA') return 'Partida cancelada';
  if (e.value?.fase === 'INTERROMPIDA') return 'Partida interrompida';
  return euPerdi.value ? 'Você é o burro!' : euVenci.value ? 'Você venceu!' : 'Fim de jogo';
});

onIonViewWillEnter(() => {
  if (!jogo.estado) router.replace('/inicio');
});

async function novaPartida() {
  jogo.reiniciar();
  router.replace('/partida');
}
async function inicio() {
  jogo.reiniciar();
  router.replace('/inicio');
}
</script>

<template>
  <ion-page>
    <ion-content>
      <div v-if="e" class="pagina">
        <h1 class="titulo-grande">{{ titulo }}</h1>
        <p class="suave" v-if="e.motivo">{{ rotuloMotivo[e.motivo] }}</p>

        <div class="cartao">
          <p>Vencedor: <strong>{{ nome(e.vencedorId) }}</strong></p>
          <p>Penalizado: <strong>{{ nome(e.penalizadoId) }}</strong></p>
          <p class="suave">{{ e.numeroMao }} mãos · {{ e.rodadas }} rodadas</p>
        </div>

        <div v-for="j in e.jogadores" :key="j.id" class="cartao linha">
          <span>{{ j.nome }}<span v-if="j.id === jogo.euId" class="suave"> (você)</span></span>
          <LetrasBurro :letras="j.letras" pequeno />
        </div>

        <ion-button expand="block" @click="novaPartida">Nova partida</ion-button>
        <ion-button expand="block" fill="outline" @click="router.push('/historico')">Ver histórico</ion-button>
        <ion-button expand="block" fill="clear" @click="inicio">Voltar ao início</ion-button>
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
