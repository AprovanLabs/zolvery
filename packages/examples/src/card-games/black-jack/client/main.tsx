import React, { useEffect, useState } from 'react';

interface Ctx {
  currentPlayer: string;
  numPlayers: number;
  playOrder: string[];
  phase?: string;
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

type Phase = 'betting' | 'playing' | 'dealer' | 'results';

interface GameState {
  deck: Card[];
  players: Player[];
  dealerHand: Card[];
  dealerScore: number;
  currentPlayer: number;
  phase: Phase;
}

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
  moves: {
    bet: ({ G }: { G: GameState }, playerId: number, amount: number) => {
      const player = G.players[playerId];
      if (amount > player.chips || G.phase !== 'betting') return;
      player.chips -= amount;
      player.bet += amount;
    },
    deal: ({ G }: { G: GameState }) => {
      if (G.phase !== 'betting') return;
      const deck = shuffle(createDeck());
      G.deck = deck;
      for (const player of G.players) {
        player.hand = [deck.pop()!, deck.pop()!];
        player.score = calculateScore(player.hand);
        player.result = null;
      }
      G.dealerHand = [deck.pop()!, { ...deck.pop()!, hidden: true }];
      G.dealerScore = calculateScore(G.dealerHand);
      G.currentPlayer = 0;
      G.phase = 'playing';
    },
    hit: ({ G }: { G: GameState }) => {
      if (G.phase !== 'playing') return;
      const player = G.players[G.currentPlayer];
      player.hand.push(G.deck.pop()!);
      player.score = calculateScore(player.hand);
      if (player.score > 21) {
        player.result = 'lose';
        G.currentPlayer++;
        if (G.currentPlayer >= G.players.length) {
          G.phase = 'dealer';
        }
      }
    },
    stand: ({ G }: { G: GameState }) => {
      if (G.phase !== 'playing') return;
      G.currentPlayer++;
      if (G.currentPlayer >= G.players.length) {
        G.phase = 'dealer';
      }
    },
    double: ({ G }: { G: GameState }) => {
      if (G.phase !== 'playing') return;
      const player = G.players[G.currentPlayer];
      if (player.bet > player.chips) return;
      player.chips -= player.bet;
      player.bet *= 2;
      player.hand.push(G.deck.pop()!);
      player.score = calculateScore(player.hand);
      if (player.score > 21) player.result = 'lose';
      G.currentPlayer++;
      if (G.currentPlayer >= G.players.length) {
        G.phase = 'dealer';
      }
    },
    dealerPlay: ({ G }: { G: GameState }) => {
      if (G.phase !== 'dealer') return;
      G.dealerHand = G.dealerHand.map((c) => ({ ...c, hidden: false }));
      G.dealerScore = calculateScore(G.dealerHand);
      while (G.dealerScore < 17 && G.deck.length > 0) {
        G.dealerHand.push(G.deck.pop()!);
        G.dealerScore = calculateScore(G.dealerHand);
      }
      for (const player of G.players) {
        if (player.result === 'lose') continue;
        if (G.dealerScore > 21 || player.score > G.dealerScore) {
          player.result = 'win';
          player.chips += player.bet * 2;
        } else if (player.score === G.dealerScore) {
          player.result = 'push';
          player.chips += player.bet;
        } else {
          player.result = 'lose';
        }
      }
      G.phase = 'results';
    },
    nextRound: ({ G }: { G: GameState }) => {
      G.deck = [];
      G.dealerHand = [];
      G.dealerScore = 0;
      G.currentPlayer = 0;
      G.phase = 'betting';
      for (const player of G.players) {
        player.hand = [];
        player.score = 0;
        player.bet = 0;
        player.result = null;
      }
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
  const isMyTurn = G.phase === 'playing' && G.currentPlayer === myPlayerIndex;
  const canBet = G.phase === 'betting' && myPlayer && myPlayer.chips >= currentBet;

  // Bot betting during betting phase (single player only)
  useEffect(() => {
    if (isMultiplayer || G.phase !== 'betting') return;
    const bots = G.players.filter((p) => p.isBot && p.bet === 0 && p.chips > 0);
    if (bots.length === 0) return;
    const timer = setTimeout(() => {
      const bot = bots[0];
      const betAmount = Math.min(
        BET_INCREMENT * (Math.floor(Math.random() * 3) + 1),
        bot.chips,
      );
      moves.bet(bot.id, betAmount);
    }, BOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [G.phase, G.players, moves, isMultiplayer]);

  // Bot playing during playing phase (single player only)
  useEffect(() => {
    if (isMultiplayer || G.phase !== 'playing') return;
    const current = G.players[G.currentPlayer];
    if (!current.isBot) return;
    const timer = setTimeout(() => {
      if (current.score < 17) {
        moves.hit();
      } else {
        moves.stand();
      }
    }, BOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [G.phase, G.currentPlayer, G.players, moves, isMultiplayer]);

  // Dealer plays automatically (host triggers in multiplayer, or single player)
  useEffect(() => {
    if (G.phase !== 'dealer') return;
    // Only player 0 (host) triggers dealer play in multiplayer
    if (isMultiplayer && myPlayerIndex !== 0) return;
    const timer = setTimeout(() => moves.dealerPlay(), BOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [G.phase, moves, isMultiplayer, myPlayerIndex]);

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
            return (
              <div
                key={player.id}
                className={`rounded-xl border-2 p-4 transition-all ${
                  isActive ? 'border-slate-400 shadow-md' : 'border-slate-100'
                }`}
              >
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
                  disabled={!myPlayer || myPlayer.bet > 0}
                  className="flex-1 accent-emerald-500"
                />
                <span className="text-sm font-mono text-slate-600 w-12">
                  ${currentBet}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => moves.bet(myPlayerIndex, currentBet)}
                  disabled={!canBet || !myPlayer || myPlayer.bet > 0}
                  className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400"
                >
                  Place Bet
                </button>
                <button
                  onClick={() => moves.deal()}
                  disabled={!allBetsPlaced}
                  className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400"
                >
                  Deal
                </button>
              </div>
            </>
          )}

          {G.phase === 'playing' && (
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
        </div>
      </div>
    </div>
  );
}
