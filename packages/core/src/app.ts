import { User } from './user';

export type App = {
  appId: string;
  name: string;
  author: User;
  tags: string[];
  runnerTag: string;
};
