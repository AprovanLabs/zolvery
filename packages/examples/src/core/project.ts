import { User } from './user';

export type Project = {
  name: string;
  author: User;
  description: string;
  tags: string[];
};

export const loadProject = (projectId: string) => {
  throw new Error('Not implemented');
};
