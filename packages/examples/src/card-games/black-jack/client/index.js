import { computed, createApp, ref, inject, watch } from 'vue';

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
const BET_INCREMENT = 10;
const INITIAL_CHIPS = 100;

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

const updateHandStatus = ({ G }) => {
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
        G.dealerHand = [
          G.deck.pop(),
          { ...G.deck.pop(), hidden: true, pattern: 'striped' },
        ];

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

      onEnd: ({ G, random, kossabos }) => {
        G.dealerHand[1].hidden = false;
        while (G.deck.length > 0 && dealerShouldHit(G.dealerScore)) {
          G.dealerHand.push(G.deck.pop());
          G.dealerScore = calculateScore(G.dealerHand);
        }

        updateHandStatus({ G, random });
        Object.values(G.players).forEach((player) => {
          if (player.isWinner === false) {
            // Player busted
          } else if (G.dealerScore > 21) {
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

        // kossabos.emit('final', { score: rounds, winner: isWinner });
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

    const placeBet = () => moves.bet(currentBet.value);

    // Reset the bet when the player wins or loses
    watch(isWinner, () => currentBet.value = BET_INCREMENT);

    return {
      bet,
      players,
      phase,
      hand,
      dealerHand,
      score,
      dealerScore,
      isWinner,
      chips,
      currentBet,
      moves,
      betIncrement: BET_INCREMENT,
      placeBet,
    };
  },
  template: `
  <div class="absolute h-full w-full flex items-center flex-col pt-16">
    <!-- Dealer's Hand -->
    <div
      class="flex gap-2 h-32 flex-col items-center mb-4"
      style="color: var(--k-player-1-500)"
    >
      <Dropzone
        v-model="dealerHand"
        component="PlayingCard"
        label="Dealer"
        :shape="dealerHand?.length || 2"
        :dimensions="['4rem', '6rem']"
      />

      <Badge
        class="px-2"
        :class="[(!dealerScore || isWinner === undefined) && 'opacity-0']"
        :value="dealerScore"
      />
      <Badge
        class="px-2"
        v-if="bet"
        :class="[isWinner !== undefined && 'opacity-0']"
        :value="'+' + bet"
      />
    </div>

    <div class="relative w-full h-24 mb-8 max-w-[32rem]">
      <svg viewBox="0 0 500 100">
        <path id="curve" d="M0,30 C220,60 220,60 500,30" fill="white" />
        <text class="text-sm">
          <textPath xlink:href="#curve" startOffset="110">
            Dealer must draw to 16 and stand on all 17's
          </textPath>
        </text>
        <text class="text-sm translate-y-6">
          <textPath xlink:href="#curve" startOffset="175">
            • Insurance Pays 2:1 •
          </textPath>
        </text>
      </svg>
    </div>

    <!-- Player's Hand -->
    <div
      v-motion
      v-if="phase !== 'betting'"
      class="flex gap-2 h-32 flex-col items-center"
      :initial="{ scale: 0, opacity: 0 }"
      :enter="{ scale: 1, opacity: 1 }"
    >
      <Dropzone
        v-model="hand"
        component="PlayingCard"
        :shape="hand?.length || 2"
        :dimensions="['4rem', '6rem']"
      />

      <Badge
        v-if="isWinner === undefined"
        :class="[!score && 'opacity-0']"
        :value="score"
      />
      <Badge
        v-if="isWinner !== undefined"
        :value="isWinner ? 'Win' : 'Lose'"
        :severity="isWinner ? 'success' : 'danger'"
      />
    </div>

    <!-- Game Controls -->
    <div class="flex flex-col gap-4 w-full items-center mt-auto pb-12">
      <div class="flex flex-col gap-2">
        <InputGroup>
          <Button
            label="Hit"
            size="large"
            icon="pi pi-plus"
            :disabled="phase !== 'dealing'"
            @click="moves.hit"
          />
          <Button
            label="Stand"
            size="large"
            icon="pi pi-minus"
            :disabled="phase !== 'dealing'"
            @click="moves.stand"
          />
          <Button
            label="Double"
            size="large"
            icon="pi pi-angle-double-up"
            :disabled="phase !== 'dealing' || chips < bet"
            @click="moves.double"
          />
        </InputGroup>

        <div class="grid grid-cols-2 gap-2">
          <Button
            label="Bet"
            icon="pi pi-dollar"
            variant="outlined"
            :disabled="currentBet === 0 || phase !== 'betting'"
            @click="placeBet"
          />
          <Button
            icon="pi pi-check"
            variant="outlined"
            :label="phase === 'post' ? 'Next Round' : 'Deal'"
            :disabled="phase !== 'post' && (bet === 0 || phase !== 'betting')"
            @click="phase !== 'post' ? moves.lockInBet() : moves.nextRound()"
          />
        </div>
      </div>

      <div class="flex gap-4 items-center gap-2">
        <Slider
          v-model="currentBet"
          :disabled="phase !== 'betting' || chips === 0"
          :step="betIncrement"
          :min="betIncrement"
          :max="chips"
          class="w-56"
        />

        <span class="w-12 text-xs inline-flex items-center justify-apart gap-1">
          <span class="pi pi-dollar"></span>
          <div class="w-6">{{ chips > currentBet ? currentBet : chips }}</div>
          /
          <div class="w-6">{{ chips }}</div>
        </span>
      </div>
    </div>
  </div>
  `,
});
