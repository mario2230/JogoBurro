<script setup lang="ts">
import { computed } from 'vue';
import type { Carta } from '@/domain/types';

const props = defineProps<{ carta: Carta; selecionada?: boolean; desabilitada?: boolean }>();
defineEmits<{ (e: 'escolher'): void }>();

const simbolo = computed(() => ({ copas: '♥', espadas: '♠', ouros: '♦', paus: '♣' })[props.carta.naipe]);
const vermelha = computed(() => props.carta.naipe === 'copas' || props.carta.naipe === 'ouros');
</script>

<template>
  <button
    type="button"
    class="carta"
    :class="{ selecionada, vermelha }"
    :disabled="desabilitada"
    :aria-pressed="!!selecionada"
    :aria-label="`${carta.valor} de ${carta.naipe}`"
    @click="$emit('escolher')"
  >
    <span class="canto">{{ carta.valor }}<br />{{ simbolo }}</span>
    <span class="centro" aria-hidden="true">{{ simbolo }}</span>
  </button>
</template>

<style scoped>
.carta {
  position: relative;
  width: clamp(62px, 17vw, 90px);
  aspect-ratio: 5 / 7;
  border-radius: 10px;
  border: 2px solid transparent;
  background: var(--carta);
  color: var(--tinta);
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35);
  font-weight: 800;
  padding: 0;
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.12s ease;
}
.carta.vermelha {
  color: var(--vermelho);
}
.carta:disabled {
  opacity: 0.55;
  cursor: default;
}
.carta.selecionada {
  transform: translateY(-14px);
  border-color: var(--mostarda);
  box-shadow: 0 6px 0 rgba(0, 0, 0, 0.35);
}
.canto {
  position: absolute;
  top: 5px;
  left: 7px;
  font-size: 1.05rem;
  line-height: 1;
  text-align: center;
}
.centro {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 2.2rem;
  opacity: 0.9;
}
</style>
