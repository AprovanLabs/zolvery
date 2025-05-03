import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme-without-fonts';
import PrimeVue from 'primevue/config';

import { KossabosPlugin }  from '../../../src/plugins'

import Layout from './Layout.vue';
import './style.css';

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.use(PrimeVue, { theme: 'none', ripple: true }); 
    app.use(KossabosPlugin, { client: {} });
  }
} satisfies Theme;
