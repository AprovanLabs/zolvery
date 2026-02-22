import React from 'react';
import type { BotState } from '@aprovan/patchwork-image-boardgameio';

type Player = 0 | 1;
type Cell = Player | null;

interface GameState {
  cells: Cell[];
  current: Player;
  winner: Player | 'draw' | null;
  winLine: number[];
}

interface BoardProps {
  G: GameState;
  ctx: { currentPlayer: string };
  moves: { play: (i: number) => void; reset: () => void };
  playerID?: string;
  isMultiplayer?: boolean;
  botState?: BotState;
  botPlayerIDs?: string[];
  botCount?: number;
}

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const COLORS: Record<Player, string> = {
  0: 'oklch(72.3% 0.219 149.579)',
  1: 'oklch(62.3% 0.214 259.815)',
};

const checkWinner = (
  cells: Cell[],
): { winner: Player; line: number[] } | null => {
  for (const [a, b, c] of LINES) {
    if (cells[a] !== null && cells[a] === cells[b] && cells[a] === cells[c]) {
      return { winner: cells[a], line: [a, b, c] };
    }
  }
  return null;
};

export const game = {
  name: 'tic-tac-toe',
  minPlayers: 1,
  maxPlayers: 2,
  setup: (): GameState => ({
    cells: Array(9).fill(null),
    current: 0 as Player,
    winner: null,
    winLine: [],
  }),
  moves: {
    play: ({ G }: { G: GameState }, i: number) => {
      if (G.winner !== null || G.cells[i] !== null) return;
      G.cells[i] = G.current;
      const result = checkWinner(G.cells);
      if (result) {
        G.winner = result.winner;
        G.winLine = result.line;
      } else if (G.cells.every((c) => c !== null)) {
        G.winner = 'draw';
      } else {
        G.current = G.current === 0 ? 1 : 0;
      }
    },
    reset: ({ G }: { G: GameState }) => {
      G.cells = Array(9).fill(null);
      G.current = 0;
      G.winner = null;
      G.winLine = [];
    },
  },
  ai: {
    enumerate: (G: GameState) =>
      G.winner !== null
        ? []
        : G.cells.flatMap((c, i) =>
            c === null ? [{ move: 'play', args: [i] }] : [],
          ),
  },
};

export function app({ G, moves, botState, botCount = 0, botPlayerIDs, playerID, isMultiplayer }: BoardProps) {
  const safeBotPlayerIDs = Array.isArray(botPlayerIDs) ? botPlayerIDs : [];
  
  const over = G.winner !== null;
  const isBotThinking = botState?.isThinking ?? false;
  
  const isLocalPlayersTurn = !isMultiplayer || playerID === String(G.current);
  const isCurrentPlayerBot = safeBotPlayerIDs.includes(String(G.current));

  return (
    <div className="flex min-h-full w-full items-center justify-center bg-white p-8">
      <div className="w-full max-w-xs space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-slate-400">
              Turn
            </span>
            <div
              className="h-4 w-8 rounded-md transition-colors duration-300"
              style={{ backgroundColor: COLORS[G.current] }}
            />
            {isBotThinking && (
              <span className="animate-pulse text-xs text-slate-400">
                Thinking...
              </span>
            )}
          </div>
          <button
            onClick={() => moves.reset()}
            className="text-xs uppercase tracking-widest text-slate-400 hover:text-slate-700"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {G.cells.map((cell, i) => {
            const winning = G.winLine.includes(i);
            const isClickable = cell === null && !over && isLocalPlayersTurn && !isCurrentPlayerBot && !isBotThinking;
            return (
              <button
                key={i}
                disabled={!isClickable}
                onClick={() => moves.play(i)}
                className={`aspect-square rounded-2xl border-2 transition-all duration-200
                  ${winning ? 'scale-105 border-slate-900' : 'border-slate-200'}
                  ${isClickable ? 'hover:-translate-y-1 hover:border-slate-400' : ''}
                `}
                style={{
                  backgroundColor: cell !== null ? COLORS[cell] : '#fff',
                }}
              />
            );
          })}
        </div>

        {over && (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            {G.winner === 'draw' ? (
              <span className="text-xs uppercase tracking-widest text-slate-400">
                Draw
              </span>
            ) : (
              <>
                <span className="text-xs uppercase tracking-widest text-slate-400">
                  Winner
                </span>

                <div
                  className="h-3 w-6 rounded"
                  style={{ backgroundColor: COLORS[G.winner as Player] }}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
