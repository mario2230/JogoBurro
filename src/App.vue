<script setup lang="ts">
import { IonApp, IonRouterOutlet, toastController } from '@ionic/vue';
import { watch } from 'vue';
import { useJogo } from '@/stores/jogo';

const jogo = useJogo();

// Todos os avisos e erros do app aparecem como toast.
watch(
  () => jogo.aviso,
  async (a) => {
    if (!a) return;
    const t = await toastController.create({
      message: a.texto,
      duration: a.tipo === 'erro' ? 5000 : 2500,
      position: 'top',
      color: a.tipo === 'erro' ? 'danger' : 'primary',
    });
    await t.present();
  },
);
</script>

<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>
