import React from 'react';
import type { BotState } from '@aprovan/patchwork-image-boardgameio';

type Player = 0 | 1;
type Cell = Player | null;
type Board = Cell[][];

interface GameState {
  cells: Board;
  current: Player;
  winner: Player | 'draw' | null;
  winCells: [number, number][];
}

interface BoardProps {
  G: GameState;
  ctx: { currentPlayer: string };
  moves: { dropToken: (col: number) => void; reset: () => void };
  playerID?: string;
  isMultiplayer?: boolean;
  botState?: BotState;
  botPlayerIDs?: string[];
  botCount?: number;
}

const ROWS = 6;
const COLS = 7;

const COLORS: Record<Player, string> = {
  0: 'oklch(72.3% 0.219 149.579)',
  1: 'oklch(62.3% 0.214 259.815)',
};

const createBoard = (): Board =>
  Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill(null));

const getLowestEmptyRow = (cells: Board, col: number): number => {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (cells[row][col] === null) return row;
  }
  return -1;
};

const checkWinner = (
  cells: Board,
): { winner: Player; winCells: [number, number][] } | null => {
  const directions = [
    [0, 1], // Horizontal
    [1, 0], // Vertical
    [1, 1], // Diagonal down-right
    [1, -1], // Diagonal down-left
  ];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const player = cells[row][col];
      if (player === null) continue;

      for (const [dr, dc] of directions) {
        const winCells: [number, number][] = [[row, col]];
        let r = row + dr;
        let c = col + dc;

        while (
          r >= 0 &&
          r < ROWS &&
          c >= 0 &&
          c < COLS &&
          cells[r][c] === player
        ) {
          winCells.push([r, c]);
          r += dr;
          c += dc;
        }

        if (winCells.length >= 4) {
          return { winner: player, winCells: winCells.slice(0, 4) };
        }
      }
    }
  }
  return null;
};

const getValidMoves = (cells: Board): number[] =>
  Array.from({ length: COLS }, (_, col) => col).filter(
    (col) => getLowestEmptyRow(cells, col) !== -1,
  );

export const game = {
  name: 'connect-4',
  minPlayers: 2,
  maxPlayers: 2,
  setup: (): GameState => ({
    cells: createBoard(),
    current: 0 as Player,
    winner: null,
    winCells: [],
  }),
  moves: {
    dropToken: ({ G }: { G: GameState }, col: number) => {
      if (G.winner !== null) return;
      const row = getLowestEmptyRow(G.cells, col);
      if (row === -1) return;

      G.cells[row][col] = G.current;
      const result = checkWinner(G.cells);

      if (result) {
        G.winner = result.winner;
        G.winCells = result.winCells;
      } else if (G.cells.every((row) => row.every((cell) => cell !== null))) {
        G.winner = 'draw';
      } else {
        G.current = (1 - G.current) as Player;
      }
    },
    reset: ({ G }: { G: GameState }) => {
      G.cells = createBoard();
      G.current = 0 as Player;
      G.winner = null;
      G.winCells = [];
    },
  },
  ai: {
    enumerate: (G: GameState) =>
      G.winner !== null
        ? []
        : getValidMoves(G.cells).map((col) => ({ move: 'dropToken', args: [col] })),
  },
};

export function app({ G, moves, botState, botCount = 0, botPlayerIDs, playerID, isMultiplayer }: BoardProps) {
  const safeBotPlayerIDs = Array.isArray(botPlayerIDs) ? botPlayerIDs : [];
  
  const over = G.winner !== null;
  const isBotThinking = botState?.isThinking ?? false;
  
  const isLocalPlayersTurn = !isMultiplayer || playerID === String(G.current);
  const isCurrentPlayerBot = safeBotPlayerIDs.includes(String(G.current));

  const isWinCell = (row: number, col: number): boolean =>
    G.winCells.some(([r, c]) => r === row && c === col);

  const isColumnFull = (col: number): boolean =>
    getLowestEmptyRow(G.cells, col) === -1;

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

        {/* Board */}
        <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-2">
          {/* Column buttons */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {Array.from({ length: COLS }, (_, col) => {
              const isClickable = !isColumnFull(col) && !over && isLocalPlayersTurn && !isCurrentPlayerBot && !isBotThinking;
              return (
                <button
                  key={`drop-${col}`}
                  disabled={!isClickable}
                  onClick={() => moves.dropToken(col)}
                  className={`flex aspect-square items-center justify-center rounded-full transition-all duration-200
                    ${isClickable ? 'hover:bg-slate-200' : ''}
                  `}
                >
                  <div
                    className={`h-2 w-2 rounded-full transition-opacity
                      ${!isClickable ? 'bg-slate-200' : 'bg-slate-400'}
                    `}
                  />
                </button>
              );
            })}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {G.cells.map((row, rowIdx) =>
              row.map((cell, colIdx) => {
                const winning = isWinCell(rowIdx, colIdx);
                return (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    className={`aspect-square rounded-full border-2 transition-all duration-200
                      ${winning ? 'scale-105 border-slate-900' : 'border-slate-200'}
                      ${cell === null ? 'bg-white' : ''}
                    `}
                    style={{
                      backgroundColor: cell !== null ? COLORS[cell] : undefined,
                    }}
                  />
                );
              }),
            )}
          </div>
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
      </div>
    </div>
  );
}
