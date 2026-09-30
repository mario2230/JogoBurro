import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { IonicVue } from '@ionic/vue';
import App from './App.vue';
import router from './router';
import { useJogo } from './stores/jogo';

import '@ionic/vue/css/core.css';
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';
import './theme/variables.css';

const pinia = createPinia();
const app = createApp(App).use(IonicVue).use(pinia).use(router);

router.isReady().then(async () => {
  const jogo = useJogo();
  await jogo.iniciarApp();
  app.mount('#app');
  void jogo.prepararBluetoothNoInicio();
});
