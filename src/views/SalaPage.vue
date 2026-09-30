<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue';
import { exitOutline } from 'ionicons/icons';
import { watch } from 'vue';
import { useRouter } from 'vue-router';
import EstadoBluetooth from '@/components/EstadoBluetooth.vue';
import { MIN_JOGADORES, MAX_JOGADORES } from '@/domain/types';
import { useJogo } from '@/stores/jogo';
import { confirmar } from '@/utils/util';

const jogo = useJogo();
const router = useRouter();

onIonViewWillEnter(() => {
  if (!jogo.estado) router.replace('/inicio');
});

// A sala acompanha o estado: quando a partida começa (ou é cancelada) troca de tela.
watch(
  () => jogo.estado?.fase,
  (f) => {
    if (f === 'JOGANDO') router.replace('/jogo');
    if (f === 'CANCELADA') {
      jogo.notificar('O anfitrião fechou a sala.', 'erro');
      jogo.reiniciar();
      router.replace('/inicio');
    }
  },
);
// Se a sala some (ex.: a conexão caiu e o estado foi limpo), volta ao início.
watch(
  () => jogo.status,
  (s) => {
    if (s === 'DESCONECTADO' && jogo.papel === 'convidado' && jogo.estado?.fase === 'SALA') {
      jogo.notificar('Você foi desconectado da sala.', 'erro');
      jogo.reiniciar();
      router.replace('/inicio');
    }
  },
);

async function sair() {
  const ok = await confirmar('Sair da sala?', jogo.souAnfitriao ? 'A sala será fechada para todos.' : 'Você deixará a sala de espera.', 'Sair');
  if (!ok) return;
  await jogo.sair();
  router.replace('/inicio');
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Sala de espera</ion-title>
        <ion-buttons slot="end"><ion-button aria-label="Sair da sala" @click="sair"><ion-icon slot="icon-only" :icon="exitOutline" /></ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div v-if="jogo.estado" class="pagina">
        <EstadoBluetooth :status="jogo.status" />
        <h2>Jogadores ({{ jogo.estado.jogadores.length }}/{{ MAX_JOGADORES }})</h2>
        <div v-for="j in jogo.estado.jogadores" :key="j.id" class="cartao linha">
          <span>{{ j.nome }}<span v-if="j.id === jogo.euId" class="suave"> (você)</span></span>
          <span v-if="j.anfitriao" class="selo">anfitrião</span>
        </div>

        <template v-if="jogo.souAnfitriao">
          <div v-if="jogo.pendentes.length">
            <h2>Pedidos de entrada</h2>
            <div v-for="p in jogo.pendentes" :key="p.id" class="cartao linha">
              <span>{{ p.nome }}</span>
              <span>
                <ion-button size="small" @click="jogo.aceitar(p.id)">Aceitar</ion-button>
                <ion-button size="small" fill="outline" color="danger" @click="jogo.recusar(p.id)">Recusar</ion-button>
              </span>
            </div>
          </div>
          <p v-else class="suave">Peça aos outros para tocarem em "Procurar partidas". Os pedidos aparecem aqui.</p>

          <ion-button expand="block" :disabled="jogo.estado.jogadores.length < MIN_JOGADORES" @click="jogo.iniciarPartida()">Iniciar partida</ion-button>
          <p v-if="jogo.estado.jogadores.length < MIN_JOGADORES" class="suave">São necessários ao menos {{ MIN_JOGADORES }} jogadores.</p>
        </template>
        <p v-else class="suave">Aguardando o anfitrião iniciar a partida…</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.linha {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.selo {
  background: var(--mostarda);
  color: #1b1b1b;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 0.8rem;
  font-weight: 700;
}
</style>
