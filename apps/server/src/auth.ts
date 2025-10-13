import { Context } from "koa";

export enum Group {
  ADMIN = 'admin',
  CREATOR = 'creator',
}

export type GroupType = `${Group}`;

export const GROUPS = new Set<GroupType>(Object.values(Group));

export type AuthContext = Context & {
  user: {
    userId: string;
    username: string;
    groups: GroupType[];
  };
}
