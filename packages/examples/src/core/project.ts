import { User } from './user';

export type Project = {
  name: string;
  author: User;
  tags: string[];
};

export const loadProject = (projectId: string) => {
  throw new Error('Not implemented');
};
