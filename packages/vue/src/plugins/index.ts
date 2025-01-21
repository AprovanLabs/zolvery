import { MotionPlugin } from '@vueuse/motion';
import Config from 'primevue/config';
import { Button, Avatar, OverlayBadge, DatePicker } from 'primevue';
import { defineComponent } from 'vue';
import type { Plugin } from 'vue';

import { styleConfig } from '../ui/style';

export const KossabosPlugin: Plugin = {
  install(app, { client }) {
    if (!client) {
      console.warn('Client not created.');
      return;
    }
    app.provide('kossabos', client);

    app.use(MotionPlugin);
    app.use(Config, styleConfig);

    app.component('p-button', Button);
    app.component('p-avatar', Avatar);
    app.component('p-datepicker', defineComponent(DatePicker as unknown));
    console.log('date', DatePicker)
    app.component('p-overlay-badge', OverlayBadge);
  },
};
