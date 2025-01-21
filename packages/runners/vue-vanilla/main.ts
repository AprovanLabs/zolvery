import { KossabosPlugin } from '@kossabos/vue';
import {
  createChildTransport,
  getQueryParam,
  loadClient,
  loadScript,
  User,
} from '@kossabos/core';

const appId = getQueryParam('appId');

if (!appId) throw Error('Missing app ID');

const numberOfPlayers = getQueryParam('numberOfPlayers');
const isMultiplayer = getQueryParam('isMultiplayer');

const config = { appId, numberOfPlayers, isMultiplayer };
const user = { userId: 'jacob.samps@gmail.com' } as User;
const transport = createChildTransport();
const kossabosClient = loadClient(
  user,
  { numberOfPlayers: config.numberOfPlayers },
  transport,
);

loadScript(`http://localhost:3701/${appId}/client/index.js`, (exports: any) => {
  const { app } = exports;
  app.use(KossabosPlugin, { client: kossabosClient });
  console.log('mount!');
  app.mount('#app');
});
