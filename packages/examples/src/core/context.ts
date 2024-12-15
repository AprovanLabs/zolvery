import { User } from "./user";

export type Context = {
    user: User,
    players: User[],
    numPlayers: number,
    currentPlayerIds: string[],
    seed: string,
};
