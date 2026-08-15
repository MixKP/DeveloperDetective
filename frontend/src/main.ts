import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import './design/tokens.css';

const app = createApp(App).use(createPinia()).use(router);

// Restore the persisted session before mounting, so the first request of the
// page load already carries a token instead of racing the auth listener.
void useAuthStore()
  .init()
  .finally(() => app.mount('#app'));
