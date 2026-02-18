import type { Game } from 'boardgame.io';

export interface MultiplayerConfig {
  isMultiplayer: boolean;
  isHost?: boolean;
  appId: string;
  matchID?: string;
  botCount?: number;
}

export function getMultiplayer(config: MultiplayerConfig, game?: Game) {
  const BoardgameMultiplayer = (window as { BoardgameMultiplayer?: {
    Local?: (opts?: { bots?: Record<string, unknown>; storageKey?: string }) => unknown;
  }}).BoardgameMultiplayer;
  
  const BoardgameAI = (window as { BoardgameAI?: {
    MCTSBot?: unknown;
    RandomBot?: unknown;
  }}).BoardgameAI;

  if (config.isMultiplayer) {
    return undefined;
  }

  const bots: Record<string, unknown> = {};
  const botCount = config.botCount ?? 0;

  if (botCount > 0 && game?.ai && BoardgameAI?.MCTSBot) {
    for (let i = 1; i <= botCount; i++) {
      bots[String(i)] = BoardgameAI.MCTSBot;
    }
  }

  if (!BoardgameMultiplayer?.Local) {
    return undefined;
  }

  return BoardgameMultiplayer.Local({
    storageKey: `kossabos:bgio:${config.appId}`,
    ...(Object.keys(bots).length > 0 ? { bots } : {}),
  });
}

export function generateMatchID(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('');
}
