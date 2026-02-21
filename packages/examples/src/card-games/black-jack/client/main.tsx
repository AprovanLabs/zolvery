import React, { useEffect, useState } from 'react';

interface Ctx {
  currentPlayer: string;
  numPlayers: number;
  playOrder: string[];
  playerID?: string | null;
  phase?: string;
  events?: {
    setActivePlayers?: (opts: any) => void;
  };
}

type Suit = 'hearts' | 'diamonds' | 'spades' | 'clubs';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Card {
  name: Rank;
  suit: Suit;
  hidden?: boolean;
}

interface Player {
  id: number;
  hand: Card[];
  score: number;
  chips: number;
  bet: number;
  isBot: boolean;
  result: 'win' | 'lose' | 'push' | null;
}

type Phase = 'betting' | 'playing' | 'dealer' | 'results' | 'gameOver';

interface GameState {
  deck: Card[];
  players: Player[];
  dealerHand: Card[];
  dealerScore: number;
  currentPlayer: number;
  phase: Phase;
}

const updatePlayer = (
  G: GameState,
  idx: number,
  updater: (player: Player) => void,
) => {
  const nextPlayers = [...G.players];
  const updated = { ...nextPlayers[idx] };
  updater(updated);
  nextPlayers[idx] = updated;
  G.players = nextPlayers;
};

const BOT_DELAY_MS = 1000;
const BET_INCREMENT = 10;
const INITIAL_CHIPS = 100;
const DEFAULT_NUM_PLAYERS = 3;

const CARD_RANK: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 10, Q: 10, K: 10, A: 11,
};

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥', diamonds: '♦', spades: '♠', clubs: '♣',
};

const SUIT_COLORS: Record<Suit, string> = {
  hearts: 'text-rose-500',
  diamonds: 'text-rose-500',
  spades: 'text-slate-800',
  clubs: 'text-slate-800',
};

const PLAYER_COLORS = [
  'oklch(72.3% 0.219 149.579)', // emerald
  'oklch(62.3% 0.214 259.815)', // blue
  'oklch(70.5% 0.213 47.604)',  // amber
  'oklch(65.6% 0.241 354.308)', // pink
];

const createDeck = (): Card[] => {
  const suits: Suit[] = ['hearts', 'diamonds', 'spades', 'clubs'];
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const name of ranks) {
      deck.push({ name, suit });
    }
  }
  return deck;
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const calculateScore = (hand: Card[]): number => {
  let score = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.hidden) continue;
    if (card.name === 'A') {
      aces++;
      score += 11;
    } else {
      score += CARD_RANK[card.name];
    }
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
};

const isPlayerOut = (player: Player): boolean =>
  player.chips === 0 && player.bet === 0;

const areAllHumansOut = (players: Player[]): boolean =>
  players.filter((p) => !p.isBot).every(isPlayerOut);

const findNextActivePlayer = (players: Player[], startIdx: number): number => {
  let idx = startIdx;
  while (idx < players.length && isPlayerOut(players[idx])) {
    idx++;
  }
  return idx;
};

const createInitialState = (ctx: { numPlayers?: number }): GameState => {
  const numPlayers = ctx.numPlayers ?? DEFAULT_NUM_PLAYERS;
  const players: Player[] = Array.from({ length: numPlayers }, (_, i) => ({
    id: i,
    hand: [],
    score: 0,
    chips: INITIAL_CHIPS,
    bet: 0,
    isBot: i > 0, // Player 0 is human, rest could be bots in single player
    result: null,
  }));
  return {
    deck: [],
    players,
    dealerHand: [],
    dealerScore: 0,
    currentPlayer: 0,
    phase: 'betting',
  };
};

export const game = {
  name: 'blackjack',
  minPlayers: 1,
  maxPlayers: 4,
  setup: (ctx: { numPlayers?: number }): GameState => createInitialState(ctx),
  // Moves validate themselves based on phase and playerID.
  // Mark all players as active so anyone can make moves (validated in move logic).
  turn: {
    activePlayers: { all: '' },
  },
  moves: {
    bet: ({ G, ctx }: { G: GameState; ctx: Ctx }, playerId: number, amount: number) => {
      if (ctx.playerID !== null && ctx.playerID !== undefined && parseInt(ctx.playerID, 10) !== playerId) return;
      const player = G.players[playerId];
      if (amount > player.chips || G.phase !== 'betting') return;
      updatePlayer(G, playerId, (p) => {
        p.chips -= amount;
        p.bet += amount;
      });
    },
    deal: ({ G }: { G: GameState }) => {
      if (G.phase !== 'betting') return;
      const deck = shuffle(createDeck());
      G.deck = deck;
      const nextPlayers = G.players.map((player) => {
        // Skip dealing to players who are out
        if (isPlayerOut(player)) {
          return { ...player, hand: [], score: 0, result: null };
        }
        const hand = [deck.pop()!, deck.pop()!];
        return {
          ...player,
          hand,
          score: calculateScore(hand),
          result: null,
        };
      });
      G.players = nextPlayers;
      G.dealerHand = [deck.pop()!, { ...deck.pop()!, hidden: true }];
      G.dealerScore = calculateScore(G.dealerHand);
      // Find first active player (skip any that are out)
      G.currentPlayer = findNextActivePlayer(nextPlayers, 0);
      G.phase = G.currentPlayer >= nextPlayers.length ? 'dealer' : 'playing';
    },
    hit: ({ G, ctx }: { G: GameState; ctx: Ctx }) => {
      if (G.phase !== 'playing') return;
      if (ctx.playerID !== null && ctx.playerID !== undefined && parseInt(ctx.playerID, 10) !== G.currentPlayer) return;
      const card = G.deck.pop();
      if (!card) return;
      updatePlayer(G, G.currentPlayer, (p) => {
        p.hand = [...p.hand, card];
        p.score = calculateScore(p.hand);
        if (p.score > 21) p.result = 'lose';
      });
      const current = G.players[G.currentPlayer];
      if (current.result === 'lose' || current.score > 21) {
        G.currentPlayer = findNextActivePlayer(G.players, G.currentPlayer + 1);
        if (G.currentPlayer >= G.players.length) {
          G.phase = 'dealer';
        }
      }
    },
    stand: ({ G, ctx }: { G: GameState; ctx: Ctx }) => {
      if (G.phase !== 'playing') return;
      if (ctx.playerID !== null && ctx.playerID !== undefined && parseInt(ctx.playerID, 10) !== G.currentPlayer) return;
      G.currentPlayer = findNextActivePlayer(G.players, G.currentPlayer + 1);
      if (G.currentPlayer >= G.players.length) {
        G.phase = 'dealer';
      }
    },
    double: ({ G, ctx }: { G: GameState; ctx: Ctx }) => {
      if (G.phase !== 'playing') return;
      if (ctx.playerID !== null && ctx.playerID !== undefined && parseInt(ctx.playerID, 10) !== G.currentPlayer) return;
      const player = G.players[G.currentPlayer];
      if (player.bet > player.chips) return;
      const card = G.deck.pop();
      if (!card) return;
      updatePlayer(G, G.currentPlayer, (p) => {
        p.chips -= p.bet;
        p.bet *= 2;
        p.hand = [...p.hand, card];
        p.score = calculateScore(p.hand);
        if (p.score > 21) p.result = 'lose';
      });
      G.currentPlayer = findNextActivePlayer(G.players, G.currentPlayer + 1);
      if (G.currentPlayer >= G.players.length) {
        G.phase = 'dealer';
      }
    },
    dealerPlay: ({ G, ctx }: { G: GameState; ctx: Ctx }) => {
      if (G.phase !== 'dealer') return;
      if (ctx.playerID !== null && ctx.playerID !== undefined && ctx.playerID !== '0') return;
      G.dealerHand = G.dealerHand.map((c) => ({ ...c, hidden: false }));
      G.dealerScore = calculateScore(G.dealerHand);
      while (G.dealerScore < 17 && G.deck.length > 0) {
        G.dealerHand.push(G.deck.pop()!);
        G.dealerScore = calculateScore(G.dealerHand);
      }
      const nextPlayers: Player[] = G.players.map((player) => {
        if (player.result === 'lose') return player;
        if (G.dealerScore > 21 || player.score > G.dealerScore) {
          return { ...player, result: 'win' as const, chips: player.chips + player.bet * 2 };
        }
        if (player.score === G.dealerScore) {
          return { ...player, result: 'push' as const, chips: player.chips + player.bet };
        }
        return { ...player, result: 'lose' as const };
      });
      G.players = nextPlayers;
      G.phase = 'results';
    },
    nextRound: ({ G }: { G: GameState }) => {
      // Check if all human players are out
      if (areAllHumansOut(G.players)) {
        G.phase = 'gameOver';
        return;
      }
      G.deck = [];
      G.dealerHand = [];
      G.dealerScore = 0;
      G.currentPlayer = 0;
      G.phase = 'betting';
      G.players = G.players.map((player) => ({
        ...player,
        hand: [],
        score: 0,
        bet: 0,
        result: null,
      }));
    },
    newGame: ({ G }: { G: GameState }) => {
      G.deck = [];
      G.dealerHand = [];
      G.dealerScore = 0;
      G.currentPlayer = 0;
      G.phase = 'betting';
      G.players = G.players.map((player) => ({
        ...player,
        hand: [],
        score: 0,
        chips: INITIAL_CHIPS,
        bet: 0,
        result: null,
      }));
    },
  },
  ai: {
    enumerate: (G: GameState) => {
      if (G.phase === 'betting') {
        return [{ move: 'bet', args: [G.currentPlayer, BET_INCREMENT] }];
      }
      if (G.phase === 'playing') {
        const player = G.players[G.currentPlayer];
        if (player.score < 17) return [{ move: 'hit' }];
        return [{ move: 'stand' }];
      }
      return [];
    },
  },
};

interface BoardProps {
  G: GameState;
  ctx: Ctx;
  playerID: string | null;
  matchID?: string;
  isMultiplayer?: boolean;
  moves: {
    bet: (playerId: number, amount: number) => void;
    deal: () => void;
    hit: () => void;
    stand: () => void;
    double: () => void;
    dealerPlay: () => void;
    nextRound: () => void;
    newGame: () => void;
  };
}

function PlayingCard({ card, small }: { card: Card; small?: boolean }) {
  if (card.hidden) {
    return (
      <div
        className={`${small ? 'w-10 h-14' : 'w-14 h-20'} rounded-lg border-2 border-slate-300 bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center`}
      >
        <div className="w-6 h-6 rounded-full border-2 border-slate-400" />
      </div>
    );
  }
  return (
    <div
      className={`${small ? 'w-10 h-14 text-xs' : 'w-14 h-20 text-sm'} rounded-lg border-2 border-slate-200 bg-white flex flex-col items-center justify-center font-mono shadow-sm`}
    >
      <span className={`font-bold ${SUIT_COLORS[card.suit]}`}>{card.name}</span>
      <span className={SUIT_COLORS[card.suit]}>{SUIT_SYMBOLS[card.suit]}</span>
    </div>
  );
}

function Hand({ cards, small }: { cards: Card[]; small?: boolean }) {
  return (
    <div className="flex -space-x-4">
      {cards.map((card, i) => (
        <div key={i} style={{ zIndex: i }}>
          <PlayingCard card={card} small={small} />
        </div>
      ))}
    </div>
  );
}

function Badge({
  value,
  variant = 'default',
}: {
  value: string | number;
  variant?: 'default' | 'success' | 'danger' | 'muted';
}) {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-700',
    danger: 'bg-rose-100 text-rose-700',
    muted: 'bg-slate-50 text-slate-400',
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${variants[variant]}`}
    >
      {value}
    </span>
  );
}

export function app({ G, ctx, playerID, isMultiplayer, moves }: BoardProps) {
  const [currentBet, setCurrentBet] = useState(BET_INCREMENT);
  const myPlayerIndex = playerID !== null ? parseInt(playerID, 10) : 0;
  const myPlayer = G.players[myPlayerIndex];
  const amIOut = myPlayer && isPlayerOut(myPlayer);
  const isMyTurn = G.phase === 'playing' && G.currentPlayer === myPlayerIndex && !amIOut;
  const canBet = G.phase === 'betting' && myPlayer && myPlayer.chips >= currentBet && !amIOut;

  // Bot betting during betting phase (single player only)
  // Use a ref to track which bots have bet this round to prevent multiple bets
  const [botsBetThisRound, setBotsBetThisRound] = useState<Set<number>>(new Set());

  // Reset bot bet tracking when phase changes to betting
  useEffect(() => {
    if (G.phase === 'betting') {
      setBotsBetThisRound(new Set());
    }
  }, [G.phase]);

  useEffect(() => {
    if (isMultiplayer || G.phase !== 'betting') return;
    const bots = G.players.filter(
      (p) => p.isBot && p.bet === 0 && p.chips > 0 && !botsBetThisRound.has(p.id)
    );
    if (bots.length === 0) return;
    const bot = bots[0];
    const timer = setTimeout(() => {
      setBotsBetThisRound((prev) => new Set(prev).add(bot.id));
      const betAmount = Math.min(
        BET_INCREMENT * (Math.floor(Math.random() * 3) + 1),
        bot.chips,
      );
      moves.bet(bot.id, betAmount);
    }, BOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [G.phase, G.players, moves, isMultiplayer, botsBetThisRound]);

  // Bot playing during playing phase (single player only)
  // Only depend on phase and currentPlayer to avoid re-triggering on hand updates
  useEffect(() => {
    if (isMultiplayer || G.phase !== 'playing') return;
    const current = G.players[G.currentPlayer];
    if (!current || !current.isBot) return;
    const timer = setTimeout(() => {
      if (current.score < 17) {
        moves.hit();
      } else {
        moves.stand();
      }
    }, BOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [G.phase, G.currentPlayer, isMultiplayer]);

  // Dealer plays automatically (host triggers in multiplayer, or single player)
  useEffect(() => {
    if (G.phase !== 'dealer') return;
    // Only player 0 (host) triggers dealer play in multiplayer
    // In multiplayer, only proceed if we're explicitly player "0"
    if (isMultiplayer && playerID !== '0') return;
    const timer = setTimeout(() => moves.dealerPlay(), BOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [G.phase, moves, isMultiplayer, playerID]);

  // Reset bet slider when round ends
  useEffect(() => {
    if (G.phase === 'betting' && myPlayer) {
      setCurrentBet(Math.min(BET_INCREMENT, myPlayer.chips));
    }
  }, [G.phase, myPlayer?.chips]);

  const allBetsPlaced =
    G.phase === 'betting' && G.players.every((p) => p.bet > 0 || p.chips === 0);

  return (
    <div className="flex min-h-full w-full flex-col items-center bg-white p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-slate-400">
            Blackjack
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Chips</span>
            <Badge value={`$${myPlayer?.chips ?? 0}`} />
          </div>
        </div>

        {/* Dealer Section */}
        <div className="flex flex-col items-center gap-2 py-4">
          <span className="text-xs uppercase tracking-widest text-slate-400">
            Dealer
          </span>
          {G.dealerHand.length > 0 ? (
            <>
              <Hand cards={G.dealerHand} />
              {G.phase !== 'betting' && (
                <Badge
                  value={G.dealerScore}
                  variant={G.dealerScore > 21 ? 'danger' : 'default'}
                />
              )}
            </>
          ) : (
            <div className="h-20 w-14 rounded-lg border-2 border-dashed border-slate-200" />
          )}
        </div>

        {/* Players */}
        <div className="space-y-4">
          {G.players.map((player, idx) => {
            const isActive = G.phase === 'playing' && G.currentPlayer === idx;
            const isBusted = player.chips === 0 && player.bet === 0;
            return (
              <div
                key={player.id}
                className={`rounded-xl border-2 p-4 transition-all relative ${
                  isBusted
                    ? 'border-slate-200 bg-slate-50 opacity-60'
                    : isActive
                      ? 'border-slate-400 shadow-md'
                      : 'border-slate-100'
                }`}
              >
                {isBusted && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="rounded-lg bg-rose-500 px-3 py-1 text-sm font-bold text-white rotate-[-12deg] shadow-md">
                      OUT
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-6 rounded"
                      style={{ backgroundColor: PLAYER_COLORS[idx] }}
                    />
                    <span className="text-xs font-medium text-slate-600">
                      {idx === myPlayerIndex ? 'You' : isMultiplayer ? `Player ${player.id + 1}` : `Bot ${player.id}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {player.bet > 0 && (
                      <Badge value={`$${player.bet}`} variant="muted" />
                    )}
                    <Badge value={`$${player.chips}`} />
                  </div>
                </div>

                {player.hand.length > 0 ? (
                  <div className="flex items-center justify-between">
                    <Hand cards={player.hand} small />
                    <div className="flex items-center gap-2">
                      {player.result ? (
                        <Badge
                          value={player.result.toUpperCase()}
                          variant={
                            player.result === 'win'
                              ? 'success'
                              : player.result === 'lose'
                                ? 'danger'
                                : 'muted'
                          }
                        />
                      ) : (
                        <Badge
                          value={player.score}
                          variant={player.score > 21 ? 'danger' : 'default'}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-14 flex items-center justify-center text-xs text-slate-300">
                    {G.phase === 'betting' && player.bet === 0
                      ? 'Waiting for bet...'
                      : 'Ready'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="space-y-3 pt-4">
          {G.phase === 'betting' && (
            <>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={BET_INCREMENT}
                  max={myPlayer?.chips || BET_INCREMENT}
                  step={BET_INCREMENT}
                  value={currentBet}
                  onChange={(e) => setCurrentBet(Number(e.target.value))}
                  disabled={!myPlayer || myPlayer.bet > 0 || amIOut}
                  className="flex-1 accent-emerald-500"
                />
                <span className="text-sm font-mono text-slate-600 w-12">
                  ${currentBet}
                </span>
              </div>
              <div className={myPlayerIndex === 0 ? 'grid grid-cols-2 gap-2' : ''}>
                <button
                  onClick={() => moves.bet(myPlayerIndex, currentBet)}
                  disabled={!canBet || !myPlayer || myPlayer.bet > 0 || amIOut}
                  className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {amIOut ? 'Out' : 'Place Bet'}
                </button>
                {myPlayerIndex === 0 && (
                  <button
                    onClick={() => moves.deal()}
                    disabled={!allBetsPlaced}
                    className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    Deal
                  </button>
                )}
              </div>
            </>
          )}

          {G.phase === 'playing' && (
            amIOut ? (
              <div className="text-center text-sm text-slate-400">
                You are out of chips
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => moves.hit()}
                  disabled={!isMyTurn}
                  className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400"
                >
                  Hit
                </button>
                <button
                  onClick={() => moves.stand()}
                  disabled={!isMyTurn}
                  className="rounded-lg border-2 border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-400 disabled:border-slate-100 disabled:text-slate-300"
                >
                  Stand
                </button>
                <button
                  onClick={() => moves.double()}
                  disabled={!isMyTurn || !myPlayer || myPlayer.bet > myPlayer.chips}
                  className="rounded-lg border-2 border-amber-400 px-4 py-2.5 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-50 disabled:border-slate-100 disabled:text-slate-300"
                >
                  Double
                </button>
              </div>
            )
          )}

          {G.phase === 'results' && (
            <button
              onClick={() => moves.nextRound()}
              className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-900"
            >
              Next Round
            </button>
          )}

          {G.phase === 'dealer' && (
            <div className="text-center text-sm text-slate-400">
              Dealer playing...
            </div>
          )}

          {G.phase === 'gameOver' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="text-center">
                <span className="text-2xl font-bold text-slate-800">Game Over</span>
                <p className="text-sm text-slate-500 mt-1">You ran out of chips!</p>
              </div>
              <button
                onClick={() => moves.newGame()}
                className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
              >
                New Game
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
