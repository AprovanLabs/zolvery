import React, { useState, useMemo, useEffect, useRef } from 'react';

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = '9' | '10' | 'J' | 'Q' | 'K' | 'A';
type BotDifficulty = 'easy' | 'medium' | 'hard';

interface Card {
  suit: Suit;
  rank: Rank;
}

interface Player {
  id: string;
  hand: Card[];
  score: number;
  tricks: number;
  bid: number;
}

interface BuckEuchreState {
  deck: Card[];
  widow: Card[];
  players: Player[];
  trickCards: Card[];
  trumpSuit: Suit | '';
  trickWinner: number;
  leadPlayer: number;
  cardsWon: Card[];
  bidding: boolean;
  highestBid: number;
  highestBidder: number;
}

interface GameSettings {
  'bot-count': number;
  'bot-difficulty': BotDifficulty;
}

// Boardgame.io props injected into board component
interface BoardProps {
  G: BuckEuchreState;
  ctx: {
    currentPlayer: string;
    activePlayers?: Record<string, string>;
    phase: string;
    numPlayers: number;
  };
  moves: {
    placeBid: (bid: number) => void;
    passBid: () => void;
    selectTrump: (suit: Suit) => void;
    exchangeWidow: () => void;
    playCard: (cardIndex: number) => void;
    startNewRound: () => void;
  };
  playerID?: string;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['9', '10', 'J', 'Q', 'K', 'A'];
const INITIAL_SCORE = 10;
const CARDS_PER_HAND = 5;
const PLAYER_COLORS = ['#16A34A', '#2563EB', '#F97316', '#DB2777'];
const TURN_DELAY_MS = 500;
const TURN_LABEL_MS = 1000;
const BOT_PLAY_DELAY_MS = 700;

const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
};

const getCardValue = (card: Card, trumpSuit: Suit | ''): number => {
  const rankValues: Record<string, number> = {
    '9': 9, '10': 10,
    'J': trumpSuit === card.suit ? 16 : 11,
    'Q': 12, 'K': 13, 'A': 14
  };
  return card.suit === trumpSuit ? rankValues[card.rank] + 100 : rankValues[card.rank];
};

const getWinningCardIndex = (cards: Card[], leadSuit: Suit, trumpSuit: Suit | ''): number => {
  if (cards.length === 0) return -1;
  
  let winningIdx = 0;
  let winningValue = getCardValue(cards[0], trumpSuit);
  
  for (let i = 1; i < cards.length; i++) {
    const card = cards[i];
    const cardValue = getCardValue(card, trumpSuit);
    const isPlayingTrump = card.suit === trumpSuit;
    const currentWinnerIsFollowingSuit = cards[winningIdx].suit === leadSuit;
    const currentWinnerIsPlayingTrump = cards[winningIdx].suit === trumpSuit;
    
    if (isPlayingTrump && !currentWinnerIsPlayingTrump) {
      winningIdx = i;
      winningValue = cardValue;
    } else if (
      (isPlayingTrump && currentWinnerIsPlayingTrump) ||
      (card.suit === leadSuit && currentWinnerIsFollowingSuit)
    ) {
      if (cardValue > winningValue) {
        winningIdx = i;
        winningValue = cardValue;
      }
    }
  }
  return winningIdx;
};

// ============================================================================
// Bot Logic
// ============================================================================

const countSuitCards = (hand: Card[], suit: Suit): number => 
  hand.filter(c => c.suit === suit).length;

const getBestTrumpSuit = (hand: Card[]): Suit => {
  let bestSuit: Suit = 'hearts';
  let maxCount = 0;
  for (const suit of SUITS) {
    const count = countSuitCards(hand, suit);
    if (count > maxCount) {
      maxCount = count;
      bestSuit = suit;
    }
  }
  return bestSuit;
};

const shouldBid = (hand: Card[], currentBid: number, difficulty: BotDifficulty): number => {
  const trumpSuit = getBestTrumpSuit(hand);
  const trumpCount = countSuitCards(hand, trumpSuit);
  const highCards = hand.filter(c => c.rank === 'A' || c.rank === 'K').length;
  
  const thresholds = {
    easy: { minTrump: 3, minHigh: 1 },
    medium: { minTrump: 2, minHigh: 1 },
    hard: { minTrump: 2, minHigh: 0 }
  };
  const { minTrump, minHigh } = thresholds[difficulty];
  
  if (trumpCount >= minTrump && highCards >= minHigh) {
    const potentialBid = Math.min(trumpCount + Math.floor(highCards / 2), 5);
    if (potentialBid > currentBid) return potentialBid;
  }
  return 0;
};

const selectBestCard = (hand: Card[], trickCards: Card[], trumpSuit: Suit | '', difficulty: BotDifficulty): number => {
  if (trickCards.length === 0) {
    if (difficulty === 'hard') {
      const trumpCards = hand.map((c, i) => ({ card: c, index: i })).filter(({ card }) => card.suit === trumpSuit);
      if (trumpCards.length > 0) return trumpCards[0].index;
    }
    return 0;
  }
  
  const leadSuit = trickCards[0].suit;
  const followingSuit = hand.map((c, i) => ({ card: c, index: i })).filter(({ card }) => card.suit === leadSuit);
  
  if (followingSuit.length > 0) {
    return difficulty === 'easy' ? followingSuit[0].index : followingSuit[followingSuit.length - 1].index;
  }
  
  if (difficulty !== 'easy' && trumpSuit) {
    const trumpCards = hand.map((c, i) => ({ card: c, index: i })).filter(({ card }) => card.suit === trumpSuit);
    if (trumpCards.length > 0) return trumpCards[0].index;
  }
  return 0;
};

export const makeBotMove = (
  G: BuckEuchreState,
  playerID: number,
  stage: string | undefined,
  difficulty: BotDifficulty
): { move: string; args?: unknown[] } | null => {
  const player = G.players[playerID];
  
  if (stage === 'bidding') {
    const bid = shouldBid(player.hand, G.highestBid, difficulty);
    return bid > 0 ? { move: 'placeBid', args: [bid] } : { move: 'passBid' };
  }
  
  if (stage === 'selectingTrump') {
    const bestSuit = getBestTrumpSuit(player.hand);
    if (difficulty === 'hard') {
      const widowTrumpCount = G.widow.filter(c => c.suit === bestSuit).length;
      if (widowTrumpCount > countSuitCards(player.hand, bestSuit)) return { move: 'exchangeWidow' };
    }
    return { move: 'selectTrump', args: [bestSuit] };
  }
  
  if (stage === 'playingCard') {
    const cardIndex = selectBestCard(player.hand, G.trickCards, G.trumpSuit, difficulty);
    return { move: 'playCard', args: [cardIndex] };
  }
  return null;
};

export const game = {
  name: 'buck-euchre',
  minPlayers: 4,
  maxPlayers: 4,
  
  setup: ({ ctx, random }: { ctx: { numPlayers: number }; random: { Shuffle: <T>(arr: T[]) => T[] } }) => {
    const deck = createDeck();
    const shuffledDeck = random.Shuffle(deck);
    const players = Array(ctx.numPlayers).fill(null).map((_, i) => ({
      id: String(i),
      hand: [] as Card[],
      score: INITIAL_SCORE,
      tricks: 0,
      bid: 0
    }));
    
    for (let i = 0; i < CARDS_PER_HAND; i++) {
      for (let j = 0; j < ctx.numPlayers; j++) {
        players[j].hand.push(shuffledDeck.pop()!);
      }
    }
    
    return {
      deck: shuffledDeck.slice(CARDS_PER_HAND),
      widow: shuffledDeck.slice(0, CARDS_PER_HAND),
      players,
      trickCards: [] as Card[],
      trumpSuit: '' as Suit | '',
      trickWinner: -1,
      leadPlayer: 0,
      cardsWon: [] as Card[],
      bidding: true,
      highestBid: 0,
      highestBidder: -1
    };
  },
  
  turn: {
    onBegin: ({ G, events }: { G: BuckEuchreState; events: { setActivePlayers: (opts: unknown) => void } }) => {
      if (G.bidding) {
        events.setActivePlayers({ all: 'bidding' });
      } else if (G.trumpSuit === '' && G.highestBidder !== -1) {
        events.setActivePlayers({ value: { [G.highestBidder]: 'selectingTrump' } });
      } else if (G.trickCards.length === 0) {
        events.setActivePlayers({ value: { [G.leadPlayer]: 'playingCard' } });
      }
    },
    
    stages: {
      bidding: {
        moves: {
          placeBid: ({ G, playerID, events, ctx }: { G: BuckEuchreState; playerID: string; events: { endStage: () => void; endTurn: () => void }; ctx: { activePlayers?: Record<string, string> } }, bidAmount: number) => {
            if (bidAmount <= G.highestBid || bidAmount > CARDS_PER_HAND) return;
            const pid = parseInt(playerID);
            G.players[pid].bid = bidAmount;
            G.highestBid = bidAmount;
            G.highestBidder = pid;
            events.endStage();
            const activePlayers = ctx.activePlayers ? Object.keys(ctx.activePlayers) : [];
            const remainingPlayers = Math.max(activePlayers.length - 1, 0);
            if (remainingPlayers === 0 && G.highestBidder !== -1) {
              G.bidding = false;
              events.endTurn();
            }
          },
          passBid: ({ G, playerID, events, ctx }: { G: BuckEuchreState; playerID: string; events: { endStage: () => void; endTurn: () => void }; ctx: { activePlayers?: Record<string, string> } }) => {
            const pid = parseInt(playerID);
            G.players[pid].bid = 0;
            events.endStage();
            const activePlayers = ctx.activePlayers ? Object.keys(ctx.activePlayers) : [];
            const remainingPlayers = Math.max(activePlayers.length - 1, 0);
            if (remainingPlayers === 0 && G.highestBidder !== -1) {
              G.bidding = false;
              events.endTurn();
            } else if (remainingPlayers === 0 && G.highestBidder === -1) {
              G.highestBidder = G.leadPlayer;
              G.highestBid = 1;
              G.players[G.leadPlayer].bid = 1;
              G.bidding = false;
              events.endTurn();
            }
          }
        }
      },
      selectingTrump: {
        moves: {
          selectTrump: ({ G, events }: { G: BuckEuchreState; events: { endStage: () => void; endTurn: () => void } }, suit: Suit) => {
            if (!SUITS.includes(suit)) return;
            G.trumpSuit = suit;
            G.leadPlayer = G.highestBidder;
            events.endStage();
            events.endTurn();
          },
          exchangeWidow: ({ G, playerID }: { G: BuckEuchreState; playerID: string }) => {
            const pid = parseInt(playerID);
            const tempHand = [...G.players[pid].hand];
            G.players[pid].hand = [...G.widow];
            G.widow = tempHand;
          }
        }
      },
      playingCard: {
        moves: {
          playCard: ({ G, playerID, events, ctx }: { G: BuckEuchreState; playerID: string; events: { endStage: () => void; setActivePlayers: (opts: unknown) => void; setPhase: (phase: string) => void }; ctx: { numPlayers: number } }, cardIndex: number) => {
            const pid = parseInt(playerID);
            const player = G.players[pid];
            
            if (G.trickCards.length > 0) {
              const leadCard = G.trickCards[0];
              const hasLeadSuit = player.hand.some((card: Card) => card.suit === leadCard.suit);
              if (hasLeadSuit && player.hand[cardIndex].suit !== leadCard.suit) return;
            }
            
            const playedCard = player.hand.splice(cardIndex, 1)[0];
            G.trickCards.push(playedCard);
            
            if (G.trickCards.length < ctx.numPlayers) {
              const nextPlayer = (G.leadPlayer + G.trickCards.length) % ctx.numPlayers;
              events.endStage();
              events.setActivePlayers({ value: { [nextPlayer]: 'playingCard' } });
            } else {
              const leadSuit = G.trickCards[0].suit;
              const winnerIdx = getWinningCardIndex(G.trickCards, leadSuit, G.trumpSuit);
              const winnerID = (G.leadPlayer + winnerIdx) % ctx.numPlayers;
              
              G.trickWinner = winnerID;
              G.players[winnerID].tricks += 1;
              G.cardsWon = [...G.cardsWon, ...G.trickCards];
              G.leadPlayer = winnerID;
              G.trickCards = [];
              events.endStage();
              
              if (G.players.every((p: Player) => p.hand.length === 0)) {
                events.setPhase('scoring');
              } else {
                events.setActivePlayers({ value: { [winnerID]: 'playingCard' } });
              }
            }
          }
        }
      }
    }
  },
  
  phases: {
    play: { start: true, next: 'scoring' },
    scoring: {
      moves: {
        startNewRound: ({ G, ctx, random, events }: { G: BuckEuchreState; ctx: { numPlayers: number }; random: { Shuffle: <T>(arr: T[]) => T[] }; events: { setPhase: (phase: string) => void; endTurn: () => void } }) => {
          G.players.forEach((player: Player, idx: number) => {
            if (idx === G.highestBidder) {
              player.score += player.tricks >= player.bid ? -player.bid : player.bid;
            } else {
              player.score += player.tricks > 0 ? -player.tricks : 1;
            }
            player.tricks = 0;
            player.bid = 0;
            player.hand = [];
          });
          
          const deck = createDeck();
          const shuffledDeck = random.Shuffle(deck);
          
          for (let i = 0; i < CARDS_PER_HAND; i++) {
            for (let j = 0; j < ctx.numPlayers; j++) {
              G.players[j].hand.push(shuffledDeck.pop()!);
            }
          }
          
          G.widow = shuffledDeck.slice(0, CARDS_PER_HAND);
          G.deck = shuffledDeck.slice(CARDS_PER_HAND);
          G.trickCards = [];
          G.trumpSuit = '';
          G.trickWinner = -1;
          G.leadPlayer = (G.leadPlayer + 1) % ctx.numPlayers;
          G.cardsWon = [];
          G.bidding = true;
          G.highestBid = 0;
          G.highestBidder = -1;
          events.setPhase('play');
          events.endTurn();
        }
      }
    }
  },
  
  endIf: ({ G }: { G: BuckEuchreState }) => {
    const winner = G.players.findIndex((p: Player) => p.score <= 0);
    if (winner !== -1) return { winner };
  },
  
  ai: {
    enumerate: (
      G: BuckEuchreState,
      ctx: { currentPlayer: string; activePlayers?: Record<string, string>; phase: string },
      playerID?: string,
    ) => {
      const moves: Array<{ move: string; args?: unknown[] }> = [];
      const activePlayerID = playerID ?? ctx.currentPlayer;
      const stage = ctx.activePlayers?.[activePlayerID];
      
      if (stage === 'bidding') {
        moves.push({ move: 'passBid' });
        for (let i = G.highestBid + 1; i <= CARDS_PER_HAND; i++) {
          moves.push({ move: 'placeBid', args: [i] });
        }
      } else if (stage === 'selectingTrump') {
        SUITS.forEach(suit => moves.push({ move: 'selectTrump', args: [suit] }));
        moves.push({ move: 'exchangeWidow' });
      } else if (stage === 'playingCard') {
        const player = G.players[parseInt(activePlayerID)];
        let validCards = player.hand.map((_: Card, i: number) => i);
        if (G.trickCards.length > 0) {
          const leadSuit = G.trickCards[0].suit;
          if (player.hand.some((card: Card) => card.suit === leadSuit)) {
            validCards = validCards.filter((i: number) => player.hand[i].suit === leadSuit);
          }
        }
        validCards.forEach((cardIndex: number) => moves.push({ move: 'playCard', args: [cardIndex] }));
      } else if (ctx.phase === 'scoring') {
        moves.push({ move: 'startNewRound' });
      }
      return moves;
    }
  }
};

const getSuitIcon = (suit: Suit): string => {
  const icons: Record<Suit, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
  return icons[suit];
};

const getSuitColor = (suit: Suit): string => {
  return suit === 'hearts' || suit === 'diamonds' ? 'text-red-500' : 'text-gray-800';
};

interface CardDisplayProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  draggable?: boolean;
  onDragStart?: () => void;
  onDragMove?: (point: { x: number; y: number }) => void;
  onDragEnd?: (point: { x: number; y: number; wasClick: boolean }) => void;
}

const CardDisplay: React.FC<CardDisplayProps> = ({
  card,
  onClick,
  disabled,
  size = 'md',
  draggable = false,
  onDragStart,
  onDragMove,
  onDragEnd,
}) => {
  const sizeClasses = size === 'sm' ? 'w-16 h-24' : 'w-24 h-32';
  const textSize = size === 'sm' ? 'text-sm' : 'text-xl';
  const iconSize = size === 'sm' ? 'text-2xl' : 'text-4xl';
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable || disabled) return;
    event.preventDefault();
    dragStart.current = { x: event.clientX, y: event.clientY };
    activePointerId.current = event.pointerId;
    setDragging(true);
    cardRef.current?.setPointerCapture(event.pointerId);
    onDragStart?.();
  };

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (activePointerId.current !== null && event.pointerId !== activePointerId.current) {
        return;
      }
      event.preventDefault();
      const x = event.clientX - dragStart.current.x;
      const y = event.clientY - dragStart.current.y;
      dragOffsetRef.current = { x, y };
      setDragOffset({ x, y });
      onDragMove?.({ x: event.clientX, y: event.clientY });
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (activePointerId.current !== null && event.pointerId !== activePointerId.current) {
        return;
      }
      event.preventDefault();
      if (activePointerId.current !== null) {
        cardRef.current?.releasePointerCapture(activePointerId.current);
      }
      const { x, y } = dragOffsetRef.current;
      const distance = Math.hypot(x, y);
      const wasClick = distance < 6;
      activePointerId.current = null;
      setDragging(false);
      setDragOffset({ x: 0, y: 0 });
      dragOffsetRef.current = { x: 0, y: 0 };
      onDragEnd?.({ x: event.clientX, y: event.clientY, wasClick });
      if (wasClick && onClick && !disabled) {
        onClick();
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp, { passive: false });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging, onClick, disabled, onDragMove, onDragEnd]);
  
  return (
    <div
      ref={cardRef}
      className={`relative flex items-center justify-center border rounded-xl bg-white text-slate-900 shadow-sm select-none touch-none ${sizeClasses} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab'
      } ${dragging ? 'cursor-grabbing shadow-lg' : 'hover:-translate-y-1 hover:shadow-md'} transition-transform duration-200`}
      style={{
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)${dragging ? ' rotate(-2deg)' : ''}`,
        transition: dragging ? 'none' : 'transform 200ms ease',
        userSelect: 'none',
      }}
      onClick={disabled ? undefined : onClick}
      onPointerDown={handlePointerDown}
    >
      <div className={`${getSuitColor(card.suit)} ${textSize} absolute top-1 left-2`}>{card.rank}</div>
      <div className={`${getSuitColor(card.suit)} ${iconSize}`}>{getSuitIcon(card.suit)}</div>
      <div className={`${getSuitColor(card.suit)} ${textSize} absolute bottom-1 right-2`}>{card.rank}</div>
    </div>
  );
};

export function app({ G, ctx, moves, playerID }: BoardProps) {
  // Get settings from context (provided by boardgameio image)
  const settings = useSettings<GameSettings>();
  const [currentBid, setCurrentBid] = useState(1);
  const [isTurnTransitioning, setIsTurnTransitioning] = useState(false);
  const [turnLabel, setTurnLabel] = useState<string | null>(null);
  const [displayTrickCards, setDisplayTrickCards] = useState<Card[]>(G.trickCards);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [isOverDropZone, setIsOverDropZone] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const displayTrickCardsRef = useRef<Card[]>(G.trickCards);
  const botQueueRef = useRef<Card[][]>([]);
  const botQueueTimerRef = useRef<number | null>(null);
  const trickHoldTimerRef = useRef<number | null>(null);
  const pid = parseInt(playerID ?? '0');
  const currentPlayerId = ctx.currentPlayer;
  const isUserTurn = currentPlayerId === String(pid);
  
  const stage =
    ctx.activePlayers?.[String(pid)] ??
    (ctx.activePlayers as Record<string, string> | undefined)?.all;
  const player = G.players[pid];
  
  // Active stages govern turn ownership; currentPlayer does not advance during active stages.
  const canBid = stage === 'bidding';
  const canSelectTrump = stage === 'selectingTrump' && pid === G.highestBidder;
  const canPlayCard = stage === 'playingCard';
  const canStartNewRound = ctx.phase === 'scoring' && currentPlayerId === String(pid);
  const minBid = Math.min(G.highestBid + 1, CARDS_PER_HAND);
  const hasValidBid = G.highestBid < CARDS_PER_HAND;

  const flushBotQueue = () => {
    if (botQueueTimerRef.current !== null) return;
    const next = botQueueRef.current.shift();
    if (!next) return;
    botQueueTimerRef.current = window.setTimeout(() => {
      setDisplayTrickCards(next);
      botQueueTimerRef.current = null;
      flushBotQueue();
    }, BOT_PLAY_DELAY_MS);
  };

  useEffect(() => {
    setIsTurnTransitioning(true);
    const label = currentPlayerId === String(pid) ? 'Your turn' : `Player ${currentPlayerId}'s turn`;
    setTurnLabel(label);

    const delayTimer = setTimeout(() => {
      setIsTurnTransitioning(false);
    }, TURN_DELAY_MS);

    const labelTimer = setTimeout(() => {
      setTurnLabel(null);
    }, TURN_LABEL_MS);

    return () => {
      clearTimeout(delayTimer);
      clearTimeout(labelTimer);
    };
  }, [currentPlayerId, pid]);

  useEffect(() => {
    displayTrickCardsRef.current = displayTrickCards;
  }, [displayTrickCards]);

  useEffect(() => {
    const next = G.trickCards;
    const currentDisplay = displayTrickCardsRef.current;

    if (trickHoldTimerRef.current !== null && next.length > 0) {
      clearTimeout(trickHoldTimerRef.current);
      trickHoldTimerRef.current = null;
    }

    if (next.length === 0) {
      botQueueRef.current = [];
      if (botQueueTimerRef.current !== null) {
        clearTimeout(botQueueTimerRef.current);
        botQueueTimerRef.current = null;
      }
      if (currentDisplay.length > 0 && trickHoldTimerRef.current === null) {
        trickHoldTimerRef.current = window.setTimeout(() => {
          setDisplayTrickCards([]);
          trickHoldTimerRef.current = null;
        }, BOT_PLAY_DELAY_MS);
      } else {
        setDisplayTrickCards([]);
      }
      return;
    }

    if (next.length <= currentDisplay.length) {
      botQueueRef.current = [];
      if (botQueueTimerRef.current !== null) {
        clearTimeout(botQueueTimerRef.current);
        botQueueTimerRef.current = null;
      }
      setDisplayTrickCards(next);
      return;
    }

    const latestIndex = next.length - 1;
    const latestPlayerId = (G.leadPlayer + latestIndex) % G.players.length;
    const isBotPlay = latestPlayerId !== pid;

    if (isBotPlay) {
      botQueueRef.current.push([...next]);
      flushBotQueue();
    } else {
      botQueueRef.current = [];
      if (botQueueTimerRef.current !== null) {
        clearTimeout(botQueueTimerRef.current);
        botQueueTimerRef.current = null;
      }
      setDisplayTrickCards(next);
    }
  }, [G.trickCards, G.leadPlayer, G.players.length, pid]);

  useEffect(() => {
    return () => {
      if (botQueueTimerRef.current !== null) {
        clearTimeout(botQueueTimerRef.current);
      }
      if (trickHoldTimerRef.current !== null) {
        clearTimeout(trickHoldTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!canBid) return;
    if (currentBid < minBid) {
      setCurrentBid(minBid);
    }
  }, [canBid, currentBid, minBid]);

  useEffect(() => {
    if (canPlayCard) return;
    setIsDraggingCard(false);
    setIsOverDropZone(false);
  }, [canPlayCard]);
  
  const canPlayThisCard = useMemo(() => (cardIndex: number): boolean => {
    if (!canPlayCard) return false;
    if (G.trickCards.length === 0) return true;
    const leadSuit = G.trickCards[0].suit;
    const hasLeadSuit = player.hand.some(c => c.suit === leadSuit);
    return !hasLeadSuit || player.hand[cardIndex].suit === leadSuit;
  }, [canPlayCard, G.trickCards, player.hand]);
  
  const handleBid = () => {
    if (!hasValidBid) return;
    const bidToPlace = Math.max(currentBid, minBid);
    moves.placeBid(bidToPlace);
    setCurrentBid(Math.min(bidToPlace + 1, CARDS_PER_HAND));
  };

  const isPointInDropZone = (x: number, y: number): boolean => {
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (!rect) return false;
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  };
  
  return (
    <div className="flex flex-col items-center w-full h-full pt-6 bg-white text-slate-900">
      {/* Header */}
      <div className="w-full px-6 pb-4 mb-6 text-center border-b border-slate-200">
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Buck Euchre</p>
          <h1 className="text-2xl font-semibold">Table</h1>
        </div>
        {settings?.['bot-count'] > 0 && (
          <p className="text-xs text-slate-400">
            Playing with {settings['bot-count']} bot(s)
          </p>
        )}
        {G.trumpSuit && (
          <div className="flex items-center justify-center mt-3">
            <span className="mr-2 text-sm text-slate-500">Trump</span>
            <span className={`${getSuitColor(G.trumpSuit)} text-xl font-bold`}>{getSuitIcon(G.trumpSuit)}</span>
          </div>
        )}
      </div>

      {turnLabel && (
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-slate-400 animate-pulse">
          {turnLabel}
        </div>
      )}
      
      {/* Player Scores */}
      <div className="grid w-full grid-cols-4 gap-3 mb-6 max-w-xl px-4">
        {G.players.map((p, idx) => (
          <div
            key={idx}
            className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2 text-xs ${pid === idx ? 'border-2' : 'border-slate-200'}`}
            style={{ borderColor: pid === idx ? PLAYER_COLORS[idx] : undefined }}
          >
            <div className="font-semibold" style={{ color: PLAYER_COLORS[idx] }}>{pid === idx ? 'You' : `P${idx}`}</div>
            <div className="text-slate-500">Score {p.score}</div>
            <div className="text-slate-500">Tricks {p.tricks}</div>
            {p.bid > 0 && <div className="text-slate-500">Bid {p.bid}</div>}
          </div>
        ))}
      </div>
      
      {/* Trick Area */}
      <div className="relative flex items-center justify-center w-full mb-8 min-h-32">
        {canPlayCard && (
          <div
            ref={dropZoneRef}
            className={`pointer-events-none absolute inset-0 mx-auto flex max-w-xl items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200 ${
              isDraggingCard ? 'opacity-100' : 'opacity-0'
            } ${
              isOverDropZone ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
            }`}
          >
            <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${isOverDropZone ? 'text-slate-900' : 'text-slate-400'}`}>
              Drop to play
            </span>
          </div>
        )}
        {displayTrickCards.length > 0 ? (
          <div className="flex items-center justify-center gap-4">
            {displayTrickCards.map((card, idx) => {
              const playerId = (G.leadPlayer + idx) % G.players.length;
              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <CardDisplay card={card} />
                  <div className="mt-1 px-2 rounded-full text-[10px] text-white" style={{ backgroundColor: PLAYER_COLORS[playerId] }}>
                    {playerId === pid ? 'You' : `P${playerId}`}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !G.bidding && G.trumpSuit && (
            <div className="italic text-slate-400">
              Waiting for {pid === G.leadPlayer ? 'you' : `P${G.leadPlayer}`} to lead...
            </div>
          )
        )}
      </div>
      
      {/* Widow (during trump selection) */}
      {canSelectTrump && (
        <div className="flex flex-col items-center mb-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Widow</h3>
          <div className="flex gap-2 mb-3">
            {G.widow.map((card, idx) => <CardDisplay key={idx} card={card} size="sm" />)}
          </div>
          <button onClick={() => moves.exchangeWidow()} className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white bg-slate-900 rounded-md hover:bg-slate-800">
            Exchange with Widow
          </button>
        </div>
      )}
      
      {/* Player's Hand and Actions */}
      <div className="flex flex-col items-center w-full mt-auto">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Your Hand</h3>
        <p className="mb-4 text-xs text-slate-400">Drag a card to play it</p>
        <div className="flex justify-center gap-2 mb-6 flex-wrap select-none">
          {player.hand.map((card, idx) => (
            <CardDisplay
              key={idx}
              card={card}
              disabled={!canPlayThisCard(idx)}
              onClick={() => canPlayThisCard(idx) && moves.playCard(idx)}
              draggable={canPlayThisCard(idx)}
              onDragStart={() => {
                if (!canPlayThisCard(idx)) return;
                setIsDraggingCard(true);
              }}
              onDragMove={({ x, y }) => {
                if (!canPlayThisCard(idx)) return;
                setIsOverDropZone(isPointInDropZone(x, y));
              }}
              onDragEnd={({ x, y, wasClick }) => {
                setIsDraggingCard(false);
                setIsOverDropZone(false);
                if (wasClick) return;
                if (canPlayThisCard(idx) && isPointInDropZone(x, y)) {
                  moves.playCard(idx);
                }
              }}
            />
          ))}
        </div>
        
        <div className="flex flex-col items-center w-full gap-4 p-4 mb-6">
          {/* Bidding Controls */}
          {canBid && (
            <div className="flex flex-col items-center w-full max-w-md gap-2 rounded-xl border border-slate-200 px-4 py-3">
              <div className="flex items-center justify-center w-full gap-4">
                <input
                  type="range"
                  value={currentBid}
                  onChange={e => setCurrentBid(parseInt(e.target.value))}
                  min={minBid}
                  max={CARDS_PER_HAND}
                  disabled={!hasValidBid}
                  className="w-full disabled:opacity-40"
                />
                <span className="text-lg font-bold text-slate-800">{currentBid}</span>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleBid}
                  disabled={!hasValidBid}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Bid {currentBid}
                </button>
                <button onClick={() => moves.passBid()} className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50">Pass</button>
              </div>
              {!hasValidBid && (
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Max bid reached</div>
              )}
            </div>
          )}
          
          {/* Trump Selection */}
          {canSelectTrump && (
            <div className="flex flex-col items-center w-full max-w-md gap-2 rounded-xl border border-slate-200 px-4 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Select Trump</h3>
              <div className="flex justify-center gap-3">
                {SUITS.map(suit => (
                  <button key={suit} onClick={() => moves.selectTrump(suit)} className={`px-4 py-2 text-2xl bg-white border border-slate-200 rounded-md shadow-sm hover:shadow-md ${getSuitColor(suit)}`}>
                    {getSuitIcon(suit)}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* New Round Button */}
          {canStartNewRound && (
            <button onClick={() => moves.startNewRound()} className="px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white bg-slate-900 rounded-md hover:bg-slate-800">
              Start New Round
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
