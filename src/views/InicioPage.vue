<script setup lang="ts">
import { IonContent, IonPage, IonButton } from '@ionic/vue';
import { useRouter } from 'vue-router';
import { useJogo } from '@/stores/jogo';

const jogo = useJogo();
const router = useRouter();
const jogar = () => router.push(jogo.perfil ? '/partida' : '/identificacao');
</script>

<template>
  <ion-page>
    <ion-content>
      <div class="pagina">
        <h1 class="titulo-grande">Burro</h1>
        <p class="suave">Jogo de cartas para 2 a 5 pessoas, direto entre celulares por Bluetooth. Não precisa de internet.</p>
        <p v-if="jogo.perfil" class="suave">Jogando como <strong>{{ jogo.perfil.nome }}</strong></p>

        <section class="regras" aria-labelledby="titulo-regras">
          <h2 id="titulo-regras">Regras do jogo</h2>
          <ol>
            <li>Cada pessoa recebe 4 cartas. Na sua vez, passe uma carta para o próximo jogador.</li>
            <li>Ao juntar 4 cartas do mesmo valor, toque em <strong>Bater</strong>. Os demais também devem bater.</li>
            <li>Quem bater por último recebe uma letra de BURRO. Com 5 letras, a partida termina.</li>
            <li>Depois de cada mão, as cartas são embaralhadas e distribuídas novamente.</li>
          </ol>
        </section>

        <ion-button expand="block" @click="jogar">Jogar</ion-button>
        <ion-button expand="block" fill="outline" @click="router.push('/historico')">Histórico de partidas</ion-button>
        <ion-button v-if="jogo.perfil" expand="block" fill="clear" @click="router.push('/identificacao')">Trocar meu nome</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.regras {
  margin: 24px 0;
  padding: 16px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.regras h2 {
  margin: 0 0 10px;
  font-size: 1.2rem;
}

.regras ol {
  margin: 0;
  padding-left: 22px;
  color: var(--texto-suave);
}

.regras li + li {
  margin-top: 8px;
}

.regras strong {
  color: var(--texto);
}
</style>
