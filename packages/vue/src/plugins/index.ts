import { MotionPlugin } from '@vueuse/motion';
import Badge from 'primevue/badge';
import InputGroup from 'primevue/inputgroup';
import {
  Avatar,
  Button,
  Icon,
  Dropzone,
  Hand,
  PlayingCard,
  Slider,
} from '@kossabos/vue'
import Config from 'primevue/config';
import Tooltip from 'primevue/tooltip';
import Ripple from 'primevue/ripple';
import type { Plugin } from 'vue';

import { styleConfig } from '../ui/style';

export { styleConfig };
export const KossabosPlugin: Plugin = {
  install(app, { client }: { client: any }) {
    if (!client) {
      console.warn('Client not created.');
      return;
    }
    app.provide('kossabos', client);

    app.use(MotionPlugin);
    app.use(Config, styleConfig);

    app.directive('tooltip', Tooltip);
    app.directive('ripple', Ripple);
    app.component('Avatar', Avatar);
    app.component('Badge', Badge);
    app.component('Button', Badge);
    app.component('Icon', Icon);
    app.component('InputGroup', InputGroup);
    app.component('Button', Button);
    app.component('Dropzone', Dropzone);
    app.component('Hand', Hand);
    app.component('PlayingCard', PlayingCard);
    app.component('Slider', Slider);
  },
};
