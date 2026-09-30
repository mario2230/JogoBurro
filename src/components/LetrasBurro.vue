<script setup lang="ts">
withDefaults(defineProps<{ letras: number; pequeno?: boolean }>(), { pequeno: false });
const PALAVRA = ['B', 'U', 'R', 'R', 'O'];
</script>

<template>
  <span class="letras" :class="{ pequeno }" :aria-label="`${letras} de 5 letras`">
    <span v-for="(l, i) in PALAVRA" :key="i" class="letra" :class="{ cheia: i < letras }">{{ l }}</span>
  </span>
</template>

<style scoped>
.letras {
  display: inline-flex;
  gap: 4px;
}
.letra {
  width: 30px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  border: 2px dashed rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.25);
  font-weight: 800;
}
.letra.cheia {
  border: 2px solid var(--vermelho);
  background: var(--vermelho);
  color: #fff;
}
.pequeno .letra {
  width: 18px;
  height: 20px;
  font-size: 0.7rem;
  border-radius: 4px;
  border-width: 1px;
}
</style>
