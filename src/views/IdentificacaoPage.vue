<script setup lang="ts">
import { IonButton, IonContent, IonHeader, IonInput, IonPage, IonTitle, IonToolbar, IonButtons, IonBackButton } from '@ionic/vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useJogo } from '@/stores/jogo';

const jogo = useJogo();
const router = useRouter();
const nome = ref(jogo.perfil?.nome ?? '');
const erro = ref('');

async function salvar() {
  const n = nome.value.trim();
  if (n.length < 2) return (erro.value = 'Digite um nome com pelo menos 2 letras.');
  await jogo.definirNome(n);
  router.replace('/partida');
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/inicio" text="Voltar" /></ion-buttons>
        <ion-title>Quem é você?</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina">
        <p class="suave">Este nome aparece para os outros jogadores na sala de espera.</p>
        <ion-input
          v-model="nome"
          label="Seu nome"
          label-placement="floating"
          fill="outline"
          :maxlength="20"
          :clear-input="true"
          :error-text="erro"
          @keyup.enter="salvar"
        />
        <p v-if="erro" class="suave" style="color: var(--ion-color-danger)">{{ erro }}</p>
        <ion-button expand="block" style="margin-top: 16px" @click="salvar">Continuar</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>
