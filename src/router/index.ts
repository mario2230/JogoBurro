import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/inicio' },
  { path: '/inicio', component: () => import('@/views/InicioPage.vue') },
  { path: '/identificacao', component: () => import('@/views/IdentificacaoPage.vue') },
  { path: '/partida', component: () => import('@/views/PartidaPage.vue') },
  { path: '/conexao', component: () => import('@/views/ConexaoPage.vue') },
  { path: '/sala', component: () => import('@/views/SalaPage.vue') },
  { path: '/jogo', component: () => import('@/views/JogoPage.vue') },
  { path: '/resultado', component: () => import('@/views/ResultadoPage.vue') },
  { path: '/historico', component: () => import('@/views/HistoricoPage.vue') },
  { path: '/historico/:id', component: () => import('@/views/DetalhesPartidaPage.vue') },
];

export default createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes });
