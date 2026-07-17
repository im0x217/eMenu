import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import './style.css';
import App from './App.vue';
import { initGA } from './utils/analytics';

const app = createApp(App);
const pinia = createPinia();

// Initialize Google Analytics 4
initGA();

app.use(pinia);
app.use(router);

app.mount('#app');
