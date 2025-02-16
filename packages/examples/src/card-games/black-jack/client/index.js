import { computed, createApp, ref, inject } from 'vue';

const CARD_RANK = {
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
  J: 10,
  Q: 10,
  K: 10,
  A: 11,
};

const createDeckOfCards = (
  suits = ['hearts', 'diamonds', 'spades', 'clubs'],
  names = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'],
) => {
  const deck = [];
  for (const suit of suits) {
    for (const name of names) {
      deck.push({ name, suit });
    }
  }
  return deck;
};

const calculateScore = (hand) => {
  const cards = hand.length > 0 ? hand : [];
  let score = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.name === 'A') {
      aces++;
      score += 11;
    } else {
      score += Math.min(10, CARD_RANK[card.name]);
    }
  }

  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }

  return score;
};

const dealerShouldHit = (score) => score < 17;

const updateHandStatus = ({ G, ctx, random }) => {
  Object.values(G.players).forEach((player) => {
    if (player.score > 21) {
      player.isWinner = false;
    } else if (player.score === 21) {
      player.isWinner = true;
    } else if (G.dealerScore === 21) {
      player.isWinner = false;
    }
  });
};

const BET_INCREMENT = 10;
const INITIAL_CHIPS = 100;

const resetGame = (G) => {
  G.deck = [];
  G.dealerHand = [];
  G.players = G.players.map((player) => ({
    ...player,
    hand: [],
    score: 0,
    isWinner: undefined,
  }));
};

export const game = {
  setup: ({ ctx }) => {
    const deck = createDeckOfCards();

    const players = ctx.playOrder.map((playerId) => ({
      playerId,
      hand: [],
      score: [],
      chips: INITIAL_CHIPS,
      bet: 0,
      isWinner: undefined,
    }));

    return {
      deck,
      players,
      dealerHand: [],
      dealerScore: 0,
    };
  },

  turn: {
    onBegin: ({ ctx, events }) => {
      if (ctx.phase !== 'betting') {
        return;
      }
      events.setActivePlayers({ all: 'decidingBet' });
    },
    stages: {
      decidingBet: {
        start: true,
        moves: {
          bet: ({ G, playerID }, value) => {
            const player = G.players[playerID];
            if (value > player.chips) {
              return;
            }

            player.chips -= value;
            player.bet += value;
          },
          lockInBet: ({ ctx, events }) => {
            events.endStage();
            if (Object.keys(ctx.activePlayers).length === 1) {
              events.setActivePlayers({ currentPlayer: '0' });
              events.endPhase();
            }
          },
        },
      },
    },
  },

  phases: {
    betting: {
      start: true,
      next: 'dealing',
      onBegin: ({ G }) => resetGame(G),
    },

    dealing: {
      next: 'post',
      onBegin: ({ G, events, random }) => {
        G.deck = random.Shuffle(createDeckOfCards());

        const players = G.players.map((player) => {
          const hand = [G.deck.pop(), G.deck.pop()];
          const score = calculateScore(hand);
          return { ...player, hand, score };
        });
        G.players = players;
        G.dealerHand = [G.deck.pop(), G.deck.pop()];

        updateHandStatus({ G, events, random });

        G.dealerScore = calculateScore(G.dealerHand);
      },

      moves: {
        hit: ({ G, random, events, playerID }) => {
          const player = G.players[playerID];

          player.hand = [...player.hand, G.deck.pop()];
          player.score = calculateScore(player.hand);

          updateHandStatus({ G, random });
          if (G.players[playerID].score > 21) {
            events.endTurn();
          }
        },
        stand: ({ G, events, playerID }) => {
          const player = G.players[playerID];
          player.isWinner = false;
          events.endTurn();
        },
        double: ({ G, events, playerID }) => {
          const player = G.players[playerID];
          const bet = player.bet;
          if (bet > player.chips) {
            return;
          }
          player.hit = true;
          player.chips -= bet;
          player.bet += bet;
          events.endTurn();
        },
      },

      endIf: ({ G }) =>
        Object.values(G.players).every(
          (player) => player.isWinner !== undefined,
        ),

      onEnd: ({ G, random }) => {
        while (G.deck.length > 0 && dealerShouldHit(G.dealerScore)) {
          G.dealerHand.push(G.deck.pop());
          G.dealerScore = calculateScore(G.dealerHand);
        }

        updateHandStatus({ G, random });
        Object.values(G.players).forEach((player) => {
          if (G.dealerScore > 21) {
            player.isWinner = true;
          } else if (player.score > G.dealerScore) {
            player.isWinner = true;
          } else if (G.dealerScore > player.score) {
            player.isWinner = false;
          }
        });

        Object.values(G.players).forEach((player) => {
          if (player.isWinner === true) {
            player.chips += player.bet * 2;
          }
          player.score = 0;
          player.bet = 0;
        });
      },
    },

    post: {
      next: 'betting',
      moves: { nextRound: ({ events }) => events.endPhase() },
    },
  },

  ai: {
    enumerate: (G, ctx) => {
      const player = G.players[ctx.currentPlayer];
      const maxBet = player.chips;

      // Get list of all possible bets
      const bets = Array.from(
        { length: maxBet / BET_INCREMENT },
        (_, i) => (i + 1) * 10,
      );

      const moves = [];
      if (ctx.phase === 'betting') {
        bets.forEach((bet) => moves.push({ move: 'bet', args: [bet] }));
        moves.push({ move: 'lockInBet' });
      } else {
        moves.push({ move: 'hit' });
        moves.push({ move: 'stand' });
      }

      return moves;
    },
    iterations: 1,
    playoutDepth: 1,
  },

  endIf: ({ G, ctx }) => {
    if (ctx.phase !== 'post') return false;

    let numPlayersInGame = G.players.length;
    for (const player of G.players) {
      if (player.chips === 0) {
        numPlayersInGame--;
      }
      if (player.chips >= 500) return { winner: playerID };
    }

    if (numPlayersInGame === 0) {
      return { winner: 'dealer' };
    }

    return false;
  },
};

export const app = createApp({
  setup() {
    const G = inject('G');
    const moves = inject('moves');
    const ctx = inject('ctx');

    const phase = computed(() => ctx.value.phase);
    const dealerHand = computed(() => G.value.dealerHand);
    const dealerScore = computed(() => G.value.dealerScore);

    const players = computed(() => G.value.players);

    const player = computed(() => players.value[ctx.value.currentPlayer]);
    const isWinner = computed(() => player.value.isWinner);
    const hand = computed(() => player.value.hand);
    const score = computed(() => player.value.score);
    const chips = computed(() => player.value.chips);
    const bet = computed(() => player.value.bet);

    const currentBet = ref(BET_INCREMENT);

    const placeBet = () => {
      moves.bet(currentBet.value);
    };

    return {
      players,
      phase,
      hand,
      dealerHand,
      score,
      dealerScore,
      isWinner,
      chips,
      bet,
      currentBet,
      moves,
      betIncrement: BET_INCREMENT,
      placeBet,
    };
  },
  template: `
    <div class="flex items-center justify-center flex-col gap-4">
        <!-- Dealer's Hand -->
        <div class="flex gap-2 h-32 mt-4">
          <PlayingCard
            v-for="(card, index) in dealerHand"
            :hidden="phase === 'dealing' && index === (dealerHand.length - 1)"
            pattern="striped"
            v-motion
            :suit="card.suit"
            :name="card.name"
            :key="index"
            class="bg-white text-green-500 rounded-lg w-24 h-36 flex items-center justify-center text-2xl font-bold"
          />
        </div>

        <span class="text-xs mt-8 mb-6">
          Dealer must draw to 16 and stand on all 17's
          <br />
          Insurance Pays 2:1
        </span>

        <!-- Player's Hand -->
        <div class="flex gap-2 h-32">
          <PlayingCard
            v-for="(card, index) in hand"
            v-motion
            :suit="card.suit"
            :name="card.name"
            :key="index"
            class="bg-white rounded-lg w-24 h-36 flex items-center justify-center text-2xl font-bold"
          />
        </div>

        <!-- Game Controls -->
        <div class="flex gap-4 items-center mt-8">
          <Slider
            v-model="currentBet"
            :disabled="phase !== 'betting' || chips === 0"
            :step="betIncrement"
            :min="betIncrement"
            :max="chips"
            class="w-56"
          />

          <span class="ml-2 w-12 text-xs inline-flex items-center justify-apart gap-1">
            <div class="w-6">{{ chips > currentBet ? currentBet : chips }}</div>
            /
            <div class="w-6">{{ chips }}</div>
          </span>

          <Button
            v-motion
            label="Bet"
            :disabled="currentBet === 0 || phase !== 'betting'"
            @click="placeBet"
          />
        </div>

        <div class="flex gap-4 justify-center">
          <Button
            v-motion
            :label="phase === 'post' ? 'Next Round' : 'Deal'"
            :disabled="phase !== 'post' && (bet === 0 || phase !== 'betting')"
            @click="phase !== 'post' ? moves.lockInBet() : moves.nextRound()"
          />
          <Button
            v-motion
            label="Hit"
            :disabled="phase !== 'dealing'"
            @click="moves.hit"
          />
          <Button
            v-motion
            label="Stand"
            :disabled="phase !== 'dealing'"
            @click="moves.stand"
          />
          <Button
            v-motion
            label="Double"
            :disabled="phase !== 'dealing'"
            @click="moves.double"
          />
        </div>
    </div>
  `,
});
