import { Project } from './project';
import { User } from './user';

export type Renderer<T> = {
  render: (project: Project, user: User, eventTarget: EventTarget) => T;
};
