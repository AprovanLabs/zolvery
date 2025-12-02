import { User } from './user';

export type Settings = {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue: string;
  description?: string;
  type: 'select' | 'checkbox' | 'input' | 'slider';
  // If true, the setting is required and must be set by the user
  required?: boolean;
}

export type Server = {
  version: string,
  features?: string[],
  config?: { [key: string]: any },
}

export type App = {
  appId: string;
  name: string;
  description: string;
  tags: string[];
  version: string;
  runnerTag: string;
  authorId: string;
  visibility: 'public' | 'private';
  settings: Settings[],
  servers?: { [serverId: string]: string | Server },
};
