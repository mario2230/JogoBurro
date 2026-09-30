<script setup lang="ts">
import { computed } from 'vue';
import type { StatusConexao } from '@/services/sessao-convidado';

const props = defineProps<{ status: StatusConexao }>();
const info = computed(() => {
  switch (props.status) {
    case 'CONECTADO':
      return { texto: 'Conectado', cor: '#5ad18a' };
    case 'CONECTANDO':
      return { texto: 'Conectando…', cor: '#f2b705' };
    case 'AGUARDANDO_ANFITRIAO':
      return { texto: 'Aguardando anfitrião…', cor: '#f2b705' };
    case 'RECONECTANDO':
      return { texto: 'Reconectando…', cor: '#f2b705' };
    default:
      return { texto: 'Desconectado', cor: '#e0574d' };
  }
});
</script>

<template>
  <span class="estado" role="status">
    <span class="ponto" :style="{ background: info.cor }"></span>{{ info.texto }}
  </span>
</template>

<style scoped>
.estado {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.3);
}
.ponto {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
</style>
