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
import { Local } from 'boardgame.io/multiplayer';
import { MCTSBot } from 'boardgame.io/ai';
import { BoardgamePlugin } from './src/plugins/boardgameio/vue';

import '@kossabos/vue/index.css';

const appId = getQueryParam('appId') as string;
const numberOfPlayers = getQueryParam('numberOfPlayers');
const isMultiplayer = getQueryParam('isMultiplayer');

const config = { appId, numberOfPlayers, isMultiplayer };
const user = { userId: 'jacob.samps@gmail.com' } as User;
const transport = createChildTransport();
const kossabosClient = loadClient(user, config, transport);

const getMultiplayerFromConfig = (config: any, appId: string) => {
  if (config.isMultiplayer) {
    return P2P({ isHost: true });
  }
  return Local({
    // persist: true,
    storageKey: `kossabos:bgio:${appId}`,
    bots: {
      1: MCTSBot,
      2: MCTSBot,
      3: MCTSBot,
    },
  });
};

// const wrapGameDefinition =
//   (game: { setup: (ctx: unknown, setupData: unknown) => void }) =>
//   (setupData?: unknown) => ({
//     ...game,
//     setup: (ctx: unknown) => game.setup(ctx, setupData),
//   });

const gameWithSetupData = (
  game: { setup: (ctx: unknown, setupData: unknown) => void },
  setupData?: unknown,
) => ({
  ...game,
  setup: (ctx: unknown) => game.setup(ctx, setupData),
});

loadScript(`http://localhost:3701/${appId}/client/index.js`, (exports: any) => {
  const { app, game } = exports;

  const multiplayer = getMultiplayerFromConfig(config, appId);
  const boardgameClient = Client({
    playerID: '0',
    numPlayers: +(config.numberOfPlayers ?? 1),
    game: gameWithSetupData(game),
    debug: false,
    // ...(!!multiplayer && { multiplayer }),
  });

  app.use(KossabosPlugin, { client: kossabosClient });
  console.log('starting...', '0');

  boardgameClient.subscribe((...rest) => {
    console.log('boardgameClient.subscribe', ...rest);
  });
  boardgameClient.start();

  console.log('started!', game, multiplayer);
  app.use(BoardgamePlugin, { client: boardgameClient });
  app.mount('#app');
});
