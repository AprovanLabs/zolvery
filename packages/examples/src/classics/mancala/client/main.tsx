import React from 'react';
import type { BotState } from '@kossabos/patchwork-image-boardgameio';

type Player = 0 | 1;

interface GameState {
  pits: number[];
  homes: [number, number];
  current: Player;
  winner: Player | 'draw' | null;
}

interface BoardProps {
  G: GameState;
  ctx: { currentPlayer: string };
  moves: { sow: (pitIndex: number) => void; reset: () => void };
  playerID?: string;
  isMultiplayer?: boolean;
  botState?: BotState;
  botPlayerIDs?: string[];
  botCount?: number;
}

const PITS_PER_SIDE = 6;
const INITIAL_STONES = 4;
const COLORS: Record<Player, string> = {
  0: 'oklch(72.3% 0.219 149.579)', // green
  1: 'oklch(62.3% 0.214 259.815)', // blue
};

const createPits = (): number[] =>
  Array(PITS_PER_SIDE * 2).fill(INITIAL_STONES);

const getPitOwner = (index: number): Player => (index < PITS_PER_SIDE ? 0 : 1);

// Simulate a move and return the resulting state
const simulateMove = (
  pits: number[],
  homes: [number, number],
  player: Player,
  pitIndex: number,
): { pits: number[]; homes: [number, number]; extraTurn: boolean } => {
  const newPits = [...pits];
  const newHomes: [number, number] = [...homes];
  let stones = newPits[pitIndex];
  newPits[pitIndex] = 0;

  let currentIndex = pitIndex;
  let extraTurn = false;

  while (stones > 0) {
    currentIndex++;

    // Player 0's home is after index 5
    if (player === 0 && currentIndex === PITS_PER_SIDE) {
      newHomes[0]++;
      stones--;
      extraTurn = stones === 0;
      if (stones === 0) break;
      currentIndex++;
    }

    // Player 1's home is after index 11
    if (player === 1 && currentIndex === PITS_PER_SIDE * 2) {
      newHomes[1]++;
      stones--;
      extraTurn = stones === 0;
      if (stones === 0) break;
    }

    if (currentIndex >= PITS_PER_SIDE * 2) {
      currentIndex = -1;
      continue;
    }

    newPits[currentIndex]++;
    stones--;

    // Capture logic
    if (stones === 0 && newPits[currentIndex] === 1) {
      const landedOwner = getPitOwner(currentIndex);
      if (landedOwner === player) {
        const oppositeIndex = PITS_PER_SIDE * 2 - 1 - currentIndex;
        if (newPits[oppositeIndex] > 0) {
          const captured = newPits[oppositeIndex] + 1;
          newPits[oppositeIndex] = 0;
          newPits[currentIndex] = 0;
          newHomes[player] += captured;
        }
      }
    }
  }

  return { pits: newPits, homes: newHomes, extraTurn };
};

// Get valid moves for a player
const getValidMoves = (pits: number[], player: Player): number[] => {
  const start = player === 0 ? 0 : PITS_PER_SIDE;
  const end = start + PITS_PER_SIDE;
  const moves: number[] = [];
  for (let i = start; i < end; i++) {
    if (pits[i] > 0) moves.push(i);
  }
  return moves;
};

// Check if game is over
const checkGameOver = (pits: number[]): boolean => {
  const p0Empty = pits.slice(0, PITS_PER_SIDE).every((p) => p === 0);
  const p1Empty = pits.slice(PITS_PER_SIDE).every((p) => p === 0);
  return p0Empty || p1Empty;
};

export const game = {
  name: 'mancala',
  minPlayers: 2,
  maxPlayers: 2,
  setup: (): GameState => ({
    pits: createPits(),
    homes: [0, 0],
    current: 0 as Player,
    winner: null,
  }),
  moves: {
    sow: ({ G }: { G: GameState }, pitIndex: number) => {
      if (G.winner !== null) return;
      if (getPitOwner(pitIndex) !== G.current) return;
      if (G.pits[pitIndex] === 0) return;

      const result = simulateMove(G.pits, G.homes, G.current, pitIndex);
      G.pits = result.pits;
      G.homes = result.homes;

      const gameOver = checkGameOver(G.pits);

      if (gameOver) {
        // Collect remaining stones
        G.homes[0] += G.pits.slice(0, PITS_PER_SIDE).reduce((a, b) => a + b, 0);
        G.homes[1] += G.pits.slice(PITS_PER_SIDE).reduce((a, b) => a + b, 0);
        G.pits = G.pits.map(() => 0);

        if (G.homes[0] > G.homes[1]) G.winner = 0;
        else if (G.homes[1] > G.homes[0]) G.winner = 1;
        else G.winner = 'draw';
      } else {
        G.current = result.extraTurn ? G.current : ((1 - G.current) as Player);
      }
    },
    reset: ({ G }: { G: GameState }) => {
      G.pits = createPits();
      G.homes = [0, 0];
      G.current = 0 as Player;
      G.winner = null;
    },
  },
  ai: {
    enumerate: (G: GameState) =>
      G.winner !== null
        ? []
        : getValidMoves(G.pits, G.current).map((pit) => ({
            move: 'sow',
            args: [pit],
          })),
  },
};

export function app({ G, moves, botState, botCount = 0, botPlayerIDs, playerID, isMultiplayer }: BoardProps) {
  // Ensure botPlayerIDs is always an array
  const safeBotPlayerIDs = Array.isArray(botPlayerIDs) ? botPlayerIDs : [];
  console.log('[mancala] Props received:', { botCount, botPlayerIDs, safeBotPlayerIDs, current: G.current, playerID, isMultiplayer });

  const over = G.winner !== null;
  const isBotThinking = botState?.isThinking ?? false;

  // In multiplayer, check if it's the local player's turn
  const isLocalPlayersTurn = !isMultiplayer || playerID === String(G.current);

  const renderStones = (count: number, compact: boolean = false) => {
    if (count === 0) return null;
    const size = compact ? 'h-1.5 w-1.5' : 'h-2 w-2';
    return (
      <div className="flex flex-wrap gap-0.5 justify-center items-center">
        {Array.from({ length: Math.min(count, 24) }, (_, i) => (
          <div
            key={i}
            className={`${size} rounded-full bg-slate-700 transition-all duration-200`}
          />
        ))}
        {count > 24 && (
          <span className="text-[10px] text-slate-500">+{count - 24}</span>
        )}
      </div>
    );
  };

  const Pit = ({
    index,
    stones,
    owner,
  }: {
    index: number;
    stones: number;
    owner: Player;
  }) => {
    const isOwnerBot = safeBotPlayerIDs.includes(String(owner));
    const isCurrentPlayersTurn = owner === G.current;
    // In multiplayer, only allow clicking if it's the local player's turn
    const isClickable =
      isCurrentPlayersTurn && isLocalPlayersTurn && !isOwnerBot && stones > 0 && !over && !isBotThinking;
    const isActive = owner === G.current && !over;

    return (
      <button
        onClick={() => moves.sow(index)}
        disabled={!isClickable}
        className={`relative flex aspect-[3/4] w-full flex-col items-center justify-center rounded-xl border-2 transition-all duration-200
          ${isClickable ? 'cursor-pointer hover:scale-105 hover:border-slate-400' : 'cursor-default'}
          ${isActive && stones > 0 ? 'border-slate-300 bg-white' : 'border-slate-200 bg-slate-50'}
        `}
      >
        <div className="flex-1 flex items-center justify-center p-1">
          {renderStones(stones)}
        </div>
        <span className="text-xs font-medium text-slate-500 pb-1">{stones}</span>
      </button>
    );
  };

  const Home = ({ player, stones }: { player: Player; stones: number }) => {
    const isWinning =
      over && G.winner === player;

    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border-2 p-2 transition-all duration-300
          ${isWinning ? 'scale-105 border-slate-900' : 'border-slate-200'}
        `}
        style={{
          backgroundColor: over && G.winner === player ? COLORS[player] + '20' : undefined,
        }}
      >
        <div
          className="mb-1 h-3 w-6 rounded-full"
          style={{ backgroundColor: COLORS[player] }}
        />
        <div className="flex-1 flex items-center justify-center p-1 min-h-[40px]">
          {renderStones(stones, true)}
        </div>
        <span className="text-lg font-bold text-slate-700">{stones}</span>
      </div>
    );
  };

  return (
    <div className="flex min-h-full w-full items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-slate-400">
              Turn
            </span>
            <div
              className="h-4 w-8 rounded-full transition-colors duration-300"
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

        {/* Board - Vertical Layout for Mobile */}
        <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-3 space-y-3">
          {/* Bot's Home (top) */}
          <Home player={1} stones={G.homes[1]} />

          {/* Bot's pits (top row, right to left visually but displayed left to right) */}
          <div className="grid grid-cols-6 gap-1.5">
            {[11, 10, 9, 8, 7, 6].map((i) => (
              <Pit key={i} index={i} stones={G.pits[i]} owner={1} />
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] uppercase tracking-widest text-slate-300">
              ↺ flow
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Human's pits (bottom row, left to right) */}
          <div className="grid grid-cols-6 gap-1.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Pit key={i} index={i} stones={G.pits[i]} owner={0} />
            ))}
          </div>

          {/* Human's Home (bottom) */}
          <Home player={0} stones={G.homes[0]} />
        </div>

        {/* Status */}
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
                  className="h-4 w-8 rounded-full"
                  style={{ backgroundColor: COLORS[G.winner as Player] }}
                />
              </>
            )}
          </div>
        )}

        {/* Rules (collapsed by default) */}
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-center gap-1 text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600">
            <span>How to play</span>
            <svg
              className="h-3 w-3 transition-transform group-open:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="mt-3 space-y-2 text-xs text-slate-500">
            <p>
              <span className="font-medium text-slate-600">Goal:</span> Collect the most stones in your home.
            </p>
            <p>
              <span className="font-medium text-slate-600">Play:</span> Tap a pit on your side to sow stones counter-clockwise.
            </p>
            <p>
              <span className="font-medium text-slate-600">Extra turn:</span> Land your last stone in your home.
            </p>
            <p>
              <span className="font-medium text-slate-600">Capture:</span> Land in an empty pit on your side to capture opposite stones.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
