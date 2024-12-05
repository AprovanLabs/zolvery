import { Project } from './project';

export interface Client {
  run(project: Project): void;
}

export class KossabosClient implements Client {
  public run(project: Project): void {
    console.log('Running project', project.name);
  }
}
