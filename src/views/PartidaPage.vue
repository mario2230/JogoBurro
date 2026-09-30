<script setup lang="ts">
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonPage, IonSpinner, IonTitle, IonToolbar } from '@ionic/vue';
import { useRouter } from 'vue-router';
import { useJogo } from '@/stores/jogo';
import { usandoSimulador } from '@/services/bluetooth';
import { avisar } from '@/utils/util';

const jogo = useJogo();
const router = useRouter();

async function criar() {
  try {
    await jogo.criarPartida();
    router.push('/sala');
  } catch (e: any) {
    await avisar('Não foi possível criar a partida', e?.message ?? String(e));
  }
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/inicio" text="Voltar" /></ion-buttons>
        <ion-title>Olá, {{ jogo.perfil?.nome }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina">
        <p v-if="usandoSimulador()" class="cartao suave">Modo navegador: as abas do mesmo navegador simulam o Bluetooth (só para desenvolvimento).</p>

        <div class="cartao">
          <h2>Criar partida</h2>
          <p class="suave">Você será o anfitrião: aceita os jogadores e inicia o jogo.</p>
          <ion-button expand="block" :disabled="jogo.ocupado" @click="criar">
            <ion-spinner v-if="jogo.ocupado" name="dots" /><span v-else>Criar partida</span>
          </ion-button>
        </div>

        <div class="cartao">
          <h2>Procurar partida</h2>
          <p class="suave">Encontre uma partida criada por alguém perto de você.</p>
          <ion-button expand="block" fill="outline" @click="router.push('/conexao')">Procurar partidas</ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>
