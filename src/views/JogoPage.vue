<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue';
import { exitOutline } from 'ionicons/icons';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import CartaView from '@/components/CartaView.vue';
import EstadoBluetooth from '@/components/EstadoBluetooth.vue';
import LetrasBurro from '@/components/LetrasBurro.vue';
import { letrasDe } from '@/domain/regras';
import type { Carta } from '@/domain/types';
import { useJogo } from '@/stores/jogo';
import { confirmar } from '@/utils/util';

const jogo = useJogo();
const router = useRouter();
const selecionada = ref<Carta | null>(null);
const enviando = ref(false);

onIonViewWillEnter(() => {
  if (!jogo.estado) router.replace('/inicio');
});

watch(
  () => jogo.estado?.fase,
  (f) => {
    if (f === 'FINALIZADA' || f === 'CANCELADA' || f === 'INTERROMPIDA') router.replace('/resultado');
  },
  { immediate: true },
);
// Ao mudar a vez ou a mão, a seleção anterior deixa de valer.
watch([() => jogo.minhaVez, () => jogo.minhaMao.length], () => (selecionada.value = null));

const nome = (id?: string) => jogo.estado?.jogadores.find((j) => j.id === id)?.nome ?? '';
const igual = (a: Carta | null, b: Carta) => !!a && a.valor === b.valor && a.naipe === b.naipe;

const desconectado = computed(() => jogo.estado?.jogadores.find((j) => !j.conectado));

const mensagem = computed(() => {
  const e = jogo.estado;
  if (!e) return { texto: '', tipo: 'neutra' };
  if (e.pausada && desconectado.value)
    return { texto: `${desconectado.value.nome} desconectou. A partida está pausada até ele voltar.`, tipo: 'alerta' };
  if (e.fase === 'FIM_MAO' && e.ultimoResultado) {
    const p = e.jogadores.find((j) => j.id === e.ultimoResultado!.penalizadoId)!;
    return { texto: `${p.nome} foi o último a bater e ganhou a letra ${letrasDe(p.letras).slice(-1)}. Nova mão já já…`, tipo: 'neutra' };
  }
  if (e.fase === 'BATIDA') {
    const primeiro = nome(e.ordemBatida[0]);
    return e.ordemBatida.includes(jogo.euId)
      ? { texto: 'Você já bateu. Aguardando os outros.', tipo: 'neutra' }
      : { texto: `${primeiro} completou quatro iguais! Toque em BATER agora!`, tipo: 'alerta' };
  }
  if (jogo.minhaVez) return { texto: `Sua vez! Escolha uma carta para enviar a ${jogo.proximo?.nome}.`, tipo: 'vez' };
  return { texto: `Vez de ${jogo.jogadorDaVez?.nome}…`, tipo: 'neutra' };
});

async function enviar() {
  if (!selecionada.value) return;
  enviando.value = true;
  const c = selecionada.value;
  selecionada.value = null;
  await jogo.jogar(c);
  enviando.value = false;
}

async function sair() {
  const ok = await confirmar(
    'Sair da partida?',
    jogo.souAnfitriao ? 'A partida será cancelada para todos.' : 'A partida será encerrada e registrada como abandonada.',
    'Sair',
  );
  if (!ok) return;
  await jogo.sair();
  router.replace('/inicio');
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Mão {{ jogo.estado?.numeroMao }}</ion-title>
        <ion-buttons slot="end"><ion-button aria-label="Sair da partida" @click="sair"><ion-icon slot="icon-only" :icon="exitOutline" /></ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div v-if="jogo.estado" class="pagina">
        <EstadoBluetooth :status="jogo.status" />

        <!-- Adversários: só nome, letras e QUANTIDADE de cartas (nunca as cartas) -->
        <div class="jogadores">
          <div v-for="(j, i) in jogo.estado.jogadores" :key="j.id" class="jog" :class="{ vez: i === jogo.estado.vez && jogo.estado.fase === 'JOGANDO', off: !j.conectado }">
            <span class="nome">{{ j.nome }}<span v-if="j.id === jogo.euId"> (você)</span><span v-if="!j.conectado"> · offline</span></span>
            <LetrasBurro :letras="j.letras" pequeno />
            <span class="suave qtd">{{ jogo.estado.qtdCartas[j.id] }} cartas</span>
          </div>
        </div>

        <div class="aviso" :class="mensagem.tipo" role="status" aria-live="polite">{{ mensagem.texto }}</div>
        <p class="suave rota">Você recebe de <strong>{{ jogo.anterior?.nome }}</strong> e envia para <strong>{{ jogo.proximo?.nome }}</strong>.</p>

        <h2>Suas cartas</h2>
        <div class="mao">
          <CartaView
            v-for="c in jogo.minhaMao"
            :key="c.valor + c.naipe"
            :carta="c"
            :selecionada="igual(selecionada, c)"
            :desabilitada="!jogo.minhaVez"
            @escolher="selecionada = igual(selecionada, c) ? null : c"
          />
        </div>

        <ion-button expand="block" :disabled="!jogo.minhaVez || !selecionada || enviando" @click="enviar">
          {{ selecionada ? 'Enviar carta escolhida' : 'Escolha uma carta' }}
        </ion-button>
        <ion-button expand="block" color="danger" :disabled="!jogo.podeBater" @click="jogo.bater()">BATER!</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.jogadores {
  display: grid;
  gap: 6px;
  margin: 12px 0;
}
.jog {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--feltro-escuro);
  border: 2px solid transparent;
}
.jog.vez {
  border-color: var(--mostarda);
}
.jog.off {
  opacity: 0.5;
}
.nome {
  font-weight: 700;
}
.qtd {
  font-size: 0.8rem;
}
.aviso {
  padding: 14px;
  border-radius: 12px;
  font-weight: 700;
  background: var(--feltro-escuro);
  text-align: center;
}
.aviso.vez {
  background: var(--mostarda);
  color: #1b1b1b;
}
.aviso.alerta {
  background: var(--vermelho);
  color: #fff;
}
.rota {
  text-align: center;
  font-size: 0.9rem;
}
.mao {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  padding: 18px 0 12px;
  min-height: 130px;
}
</style>
