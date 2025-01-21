import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme-without-fonts';
import PrimeVue from 'primevue/config';
import Tooltip from 'primevue/tooltip';
import { MotionPlugin } from '@vueuse/motion'
import { VueDraggableNext } from 'vue-draggable-next'

import Layout from './Layout.vue';
import PlayingCard from '../../../src/ui/elements/PlayingCard.vue';

import './style.css';


export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.use(PrimeVue, { theme: 'none'}); 
    app.use(MotionPlugin);
    app.component('PlayingCard', PlayingCard);
    // https://github.com/SortableJS/Sortable#event-object-demo
    app.component('draggable', VueDraggableNext);
    app.directive('tooltip', Tooltip);
  }
} satisfies Theme;
