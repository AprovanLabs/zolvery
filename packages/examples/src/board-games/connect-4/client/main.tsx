import React, { useEffect } from 'react';

type Player = 0 | 1;
type Cell = Player | null;
type Board = Cell[][];

interface GameState {
  cells: Board;
  current: Player;
  winner: Player | 'draw' | null;
  winCells: [number, number][];
  botCount: 0 | 1;
}

interface BoardProps {
  G: GameState;
  ctx: { currentPlayer: string };
  moves: { dropToken: (col: number) => void; reset: () => void };
  playerID?: string;
}

const ROWS = 6;
const COLS = 7;
const HUMAN: Player = 0;
const BOT: Player = 1;
const BOT_DELAY_MS = 500;

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

// Clone board for simulation
const cloneBoard = (cells: Board): Board => cells.map((row) => [...row]);

// Check if a move would win for the given player
const wouldWin = (cells: Board, col: number, player: Player): boolean => {
  const row = getLowestEmptyRow(cells, col);
  if (row === -1) return false;
  const testBoard = cloneBoard(cells);
  testBoard[row][col] = player;
  return checkWinner(testBoard)?.winner === player;
};

// Count consecutive pieces in a direction from a position
const countInDirection = (
  cells: Board,
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: Player,
): number => {
  let count = 0;
  let r = row + dr;
  let c = col + dc;
  while (r >= 0 && r < ROWS && c >= 0 && c < COLS && cells[r][c] === player) {
    count++;
    r += dr;
    c += dc;
  }
  return count;
};

// Score a move based on potential connections
const scoreMove = (cells: Board, col: number, player: Player): number => {
  const row = getLowestEmptyRow(cells, col);
  if (row === -1) return -Infinity;

  let score = 0;
  const directions: [number, number][] = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of directions) {
    const forward = countInDirection(cells, row, col, dr, dc, player);
    const backward = countInDirection(cells, row, col, -dr, -dc, player);
    const total = forward + backward + 1;

    if (total >= 4) score += 100;
    else if (total === 3) score += 10;
    else if (total === 2) score += 3;
  }

  // Prefer center columns
  score += (3 - Math.abs(col - 3)) * 2;

  return score;
};

// Smart bot move selection
const getBotMove = (cells: Board): number => {
  const validMoves = getValidMoves(cells);
  if (validMoves.length === 0) return -1;

  // 1. Win if possible
  for (const col of validMoves) {
    if (wouldWin(cells, col, BOT)) return col;
  }

  // 2. Block opponent's win
  for (const col of validMoves) {
    if (wouldWin(cells, col, HUMAN)) return col;
  }

  // 3. Avoid moves that let opponent win next turn
  const safeMoves = validMoves.filter((col) => {
    const row = getLowestEmptyRow(cells, col);
    if (row === -1) return false;
    // Check if opponent could win by playing above our move
    if (row > 0) {
      const testBoard = cloneBoard(cells);
      testBoard[row][col] = BOT;
      if (wouldWin(testBoard, col, HUMAN)) return false;
    }
    return true;
  });

  const movesToConsider = safeMoves.length > 0 ? safeMoves : validMoves;

  // 4. Score remaining moves and pick the best
  let bestCol = movesToConsider[0];
  let bestScore = -Infinity;

  for (const col of movesToConsider) {
    const score = scoreMove(cells, col, BOT);
    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }

  return bestCol;
};

export const game = {
  name: 'connect-4',
  setup: (): GameState => ({
    cells: createBoard(),
    current: HUMAN,
    winner: null,
    winCells: [],
    botCount: 1,
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
        G.current = G.current === HUMAN ? BOT : HUMAN;
      }
    },
    reset: ({ G }: { G: GameState }) => {
      G.cells = createBoard();
      G.current = HUMAN;
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

export function app({ G, moves }: BoardProps) {
  const myTurn = G.current === HUMAN;
  const over = G.winner !== null;
  const hasBot = G.botCount === 1;

  const isWinCell = (row: number, col: number): boolean =>
    G.winCells.some(([r, c]) => r === row && c === col);

  const isColumnFull = (col: number): boolean =>
    getLowestEmptyRow(G.cells, col) === -1;

  // Bot move
  useEffect(() => {
    if (over || myTurn || !hasBot) return;

    const timer = setTimeout(() => {
      const pick = getBotMove(G.cells);
      if (pick !== -1) moves.dropToken(pick);
    }, BOT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [G.cells, G.current, over, myTurn, hasBot, moves]);

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
              const disabled = isColumnFull(col) || over || (!myTurn && hasBot);
              return (
                <button
                  key={`drop-${col}`}
                  disabled={disabled}
                  onClick={() => moves.dropToken(col)}
                  className={`flex aspect-square items-center justify-center rounded-full transition-all duration-200
                    ${!disabled ? 'hover:bg-slate-200' : ''}
                  `}
                >
                  <div
                    className={`h-2 w-2 rounded-full transition-opacity
                      ${disabled ? 'bg-slate-200' : 'bg-slate-400'}
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
