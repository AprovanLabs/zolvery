import { P2P } from '@boardgame.io/p2p';
import { KossabosPlugin } from '@kossabos/vue';
import {
  createChildTransport,
  getQueryParam,
  loadClient,
  loadScript,
  User,
} from '@kossabos/core';
import { Client } from 'boardgame.io/client';
import { BoardgamePlugin } from './src/plugins/boardgameio/vue';

const appId = getQueryParam('appId');
const numberOfPlayers = getQueryParam('numberOfPlayers');
const isMultiplayer = getQueryParam('isMultiplayer');

const config = { appId, numberOfPlayers, isMultiplayer };
const isHost = true;
const user = { userId: 'jacob.samps@gmail.com' } as User;
const transport = createChildTransport();
const kossabosClient = loadClient(user, config, transport);

loadScript(`http://localhost:3701/${appId}/client/index.js`, (exports: any) => {
  const { app, game } = exports;

  const boardgameClient = Client({
    game,
    numPlayers: +(config.numberOfPlayers ?? 1),
    debug: false,
    ...(config.isMultiplayer && { multiplayer: P2P({ isHost }) }),
  });

  app.use(KossabosPlugin, { client: kossabosClient });
  boardgameClient.start();
  app.use(BoardgamePlugin, { client: boardgameClient });

  app.mount('#app');
});
