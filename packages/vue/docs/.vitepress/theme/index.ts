import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme-without-fonts';
import PrimeVue from 'primevue/config';
import Ripple from 'primevue/ripple';
import Tooltip from 'primevue/tooltip';
import { MotionPlugin } from '@vueuse/motion'

import Layout from './Layout.vue';
import PlayingCard from '../../../src/ui/elements/PlayingCard.vue';

import './style.css';

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.use(PrimeVue, { theme: 'none', ripple: true }); 
    app.use(MotionPlugin);
    app.component('PlayingCard', PlayingCard);
    app.directive('tooltip', Tooltip);
    app.directive('ripple', Ripple);
  }
} satisfies Theme;
