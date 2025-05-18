/** Adapted from https://github.com/SaFrMo/vue3-boardgame */
import { Plugin, ref, watchEffect } from 'vue';

export interface BoardgamePluginOptions {
  client: any;
}

export const BoardgamePlugin: Plugin = {
  install(app, { client }: BoardgamePluginOptions) {
    if (!client) {
      console.warn(
        'Client not created. Include `client` or `options` when installing the plugin.',
      );
      return;
    }

    const reactiveClient = ref(client);
    const initialState = reactiveClient.value.getInitialState();
    const reactiveG = ref(initialState.G);
    const reactiveCtx = ref(initialState.ctx);
    const reactivePlayerID = ref(initialState.playerID);

    watchEffect(() => {
      client.subscribe((state: any) => {
        if (!state) return;
        reactiveG.value = state.G;
        reactiveCtx.value = state.ctx;
        reactivePlayerID.value = state.playerID;
      });
    });

    app.mixin({
      computed: {
        client() {
          return reactiveClient;
        },
        ctx() {
          return reactiveCtx;
        },
        G() {
          return reactiveG;
        },
        playerID() {
          return reactivePlayerID;
        },
        moves() {
          return this.client.value.moves;
        },
      },
    });

    app.provide('G', reactiveG);
    app.provide('ctx', reactiveCtx);
    app.provide('playerID', reactivePlayerID);
    app.provide('moves', client.moves);
  },
};
