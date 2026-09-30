<script setup lang="ts">
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonPage, IonSpinner, IonTitle, IonToolbar,
  onIonViewWillEnter, onIonViewWillLeave,
} from '@ionic/vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import EstadoBluetooth from '@/components/EstadoBluetooth.vue';
import { useJogo } from '@/stores/jogo';
import type { Anuncio } from '@/services/bluetooth';

const jogo = useJogo();
const router = useRouter();
const achadas = ref<Anuncio[]>([]);
const buscando = ref(false);
const erro = ref('');

async function buscar() {
  erro.value = '';
  achadas.value = [];
  buscando.value = true;
  try {
    await jogo.procurar((a) => {
      if (!achadas.value.some((x) => x.deviceId === a.deviceId)) achadas.value.push(a);
    });
  } catch (e: any) {
    buscando.value = false;
    erro.value = e?.message ?? String(e);
  }
}

async function entrar(a: Anuncio) {
  erro.value = '';
  buscando.value = false;
  try {
    await jogo.entrarEm(a); // resolve quando o anfitrião aceita
    router.replace('/sala');
  } catch (e: any) {
    erro.value = e?.message ?? String(e);
  }
}

onIonViewWillEnter(buscar);
onIonViewWillLeave(() => jogo.pararBusca());
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/partida" text="Voltar" /></ion-buttons>
        <ion-title>Procurar partidas</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="pagina">
        <EstadoBluetooth :status="jogo.status" />

        <div v-if="jogo.status === 'CONECTANDO' || jogo.status === 'AGUARDANDO_ANFITRIAO'" class="cartao" style="text-align: center">
          <ion-spinner name="dots" />
          <p>{{ jogo.status === 'CONECTANDO' ? 'Conectando ao anfitrião…' : 'Aguardando o anfitrião aceitar a sua entrada…' }}</p>
        </div>

        <div v-if="erro" class="cartao" role="alert" style="border-color: var(--ion-color-danger)">
          <strong>Algo deu errado</strong>
          <p>{{ erro }}</p>
          <ion-button size="small" @click="buscar">Tentar de novo</ion-button>
        </div>

        <template v-else-if="jogo.status === 'DESCONECTADO'">
          <p class="suave">
            <ion-spinner v-if="buscando" name="dots" style="vertical-align: middle" />
            {{ buscando ? 'Procurando partidas por perto…' : 'Busca parada.' }}
          </p>
          <ion-list v-if="achadas.length" lines="none" style="background: transparent">
            <ion-item v-for="a in achadas" :key="a.deviceId" button detail @click="entrar(a)" style="margin-bottom: 8px; border-radius: 12px">
              <ion-label>
                <h2>{{ a.nome }}</h2>
                <p>Toque para pedir entrada</p>
              </ion-label>
            </ion-item>
          </ion-list>
          <p v-else-if="buscando" class="suave">Nenhuma partida encontrada ainda. Peça para o anfitrião criar a partida e manter o app aberto.</p>
          <ion-button expand="block" fill="outline" @click="buscar">Procurar de novo</ion-button>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>
