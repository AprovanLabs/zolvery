import { computed, createApp, inject, ref } from 'vue';

// Adapted from https://github.com/PJohannessen/yatzy
const max = (arr) =>
  arr.reduce((max, x) => Math.max(x, max), Number.MIN_SAFE_INTEGER);
const sum = (arr) => arr.reduce((sum, x) => x + sum, 0);
const isEqual = (arr1, arr2) =>
  arr1.length === arr2.length &&
  arr1.every((val, index) => val === arr2[index]);
const groupBy = (arr) =>
  arr.reduce((acc, item) => {
    const key = item;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});

const groupDice = (dice) => {
  // Group dice by their value, then order them by the count of each value showing (descending)
  const grouped = groupBy(dice);
  let result = [];
  for (let d = 1; d <= 6; d++) {
    if (grouped[d]) result.push(grouped[d]);
  }
  return result.sort((a, b) => b.length - a.length);
};

export const ScoreCalculator = {
  calculateUpperSectionTotal: (player) => {
    const upperTotal =
      ScoringCategoryDescriptions.filter((scd) => scd.section === 'Upper')
        .map((scd) => player.scoring[scd.category] ?? 0)
        .reduce((total, previous) => (total ?? 0) + (previous ?? 0)) ?? 0;
    return upperTotal;
  },
  calculateUpperSectionBonus: (player) => {
    const upperTotal = ScoreCalculator.calculateUpperSectionTotal(player);
    const upperBonus = upperTotal >= 63 ? 50 : 0;
    return upperBonus;
  },
  calculateLowerSectionTotal: (player) => {
    const lowerTotal =
      ScoringCategoryDescriptions.filter((scd) => scd.section === 'Lower')
        .map((scd) => player.scoring[scd.category] ?? 0)
        .reduce((total, previous) => (total ?? 0) + (previous ?? 0)) ?? 0;
    return lowerTotal;
  },
  calculateTotal: (player) => {
    const upperTotal = ScoreCalculator.calculateUpperSectionTotal(player);
    const upperBonus = ScoreCalculator.calculateUpperSectionBonus(player);
    const lowerTotal = ScoreCalculator.calculateLowerSectionTotal(player);
    const finalTotal = upperTotal + upperBonus + lowerTotal;
    return finalTotal;
  },
  calculators: {
    ones: (dice) => {
      // Sum all dice showing 1
      return sum(dice.filter((d) => d === 1));
    },
    twos: (dice) => {
      // Sum all dice showing 2
      return sum(dice.filter((d) => d === 2));
    },
    threes: (dice) => {
      // Sum all dice showing 3
      return sum(dice.filter((d) => d === 3));
    },
    fours: (dice) => {
      // Sum all dice showing 4
      return sum(dice.filter((d) => d === 4));
    },
    fives: (dice) => {
      // Sum all dice showing 5
      return sum(dice.filter((d) => d === 5));
    },
    sixes: (dice) => {
      // Sum all dice showing 6
      return sum(dice.filter((d) => d === 6));
    },
    onePair: (dice) => {
      // Sum of two identical dice. As there may be two pairs, take the highest scoring pair.
      let score = 0;
      const groupedDice = groupDice(dice);
      if (groupedDice[0].length >= 2) score = groupedDice[0][0] * 2;
      if (
        groupedDice.length >= 2 &&
        groupedDice[1].length >= 2 &&
        groupedDice[1][0] > groupedDice[0][0]
      )
        score = groupedDice[1][0] * 2;
      return score;
    },
    twoPairs: (dice) => {
      // Sum of two pair, otherwise 0
      let score = 0;
      const groupedDice = groupDice(dice);
      if (
        groupedDice.length >= 2 &&
        groupedDice[0].length >= 2 &&
        groupedDice[1].length === 2
      )
        score = groupedDice[0][0] * 2 + groupedDice[1][0] * 2;
      return score;
    },
    threeOfAKind: (dice) => {
      // Sum of 3 identical dice, otherwise 0
      let score = 0;
      const groupedDice = groupDice(dice);
      if (groupedDice[0].length >= 3) score = groupedDice[0][0] * 3;
      return score;
    },
    fourOfAKind: (dice) => {
      // Sum of 4 identical dice, otherwise 0
      let score = 0;
      const groupedDice = groupDice(dice);
      if (groupedDice[0].length >= 4) score = groupedDice[0][0] * 4;
      return score;
    },
    smallStraight: (dice) => {
      // Score 15 if small straight [1, 2, 3, 4, 5] is showing
      const orderedDice = dice.sort();
      let score = 0;
      if (isEqual(orderedDice, [1, 2, 3, 4, 5])) score = 15;
      return score;
    },
    largeStraight: (dice) => {
      // Score 20 if large straight [2, 3, 4, 5, 6] is showing
      const orderedDice = dice.sort();
      let score = 0;
      if (isEqual(orderedDice, [2, 3, 4, 5, 6])) score = 20;
      return score;
    },
    fullHouse: (dice) => {
      // Sum of all dice, if there is a separate three of a kind and one pair
      let score = 0;
      const groupedDice = groupDice(dice);
      if (
        groupedDice.length === 2 &&
        groupedDice[0].length === 3 &&
        groupedDice[1].length === 2
      )
        score = sum(dice);
      return score;
    },
    chance: (dice) => {
      // Sum all dice, regardless of value
      return sum(dice);
    },
    yatzy: (dice) => {
      // Score 50 if all dice are the same, otherwise 0
      let score = 0;
      const groupedDice = groupDice(dice);
      if (groupedDice[0].length === 5) score = 50;
      return score;
    },
  },
};

const createInitialScores = () => {
  return {
    ones: null,
    twos: null,
    threes: null,
    fours: null,
    fives: null,
    sixes: null,
    onePair: null,
    twoPairs: null,
    threeOfAKind: null,
    fourOfAKind: null,
    smallStraight: null,
    largeStraight: null,
    fullHouse: null,
    chance: null,
    yatzy: null,
  };
};

const totalDice = 5;

export const game = {
  name: 'Yatzy',
  setup: () => {
    const kossabos = inject('kossabos');
    const numberOfPlayers = 2;
    console.log('kossabos', kossabos);

    const players = [];
    for (let p = 0; p < numberOfPlayers; p++) {
      players.push({
        id: p.toString(),
        name: 'Player ' + (p + 1),
        scoring: createInitialScores(),
      });
    }

    const dice = Array(totalDice).fill(1);
    const diceHeld = Array(totalDice).fill(false);
    const totalRolls = 0;

    return {
      dice,
      diceHeld,
      players,
      totalRolls,
    };
  },
  moves: {
    rollDice: ({ G, random }) => {
      // Don't allow the dice to be rolled more than 3 times.
      if (G.totalRolls >= 3) return;

      // Roll a D6 for each dice that isn't being held.
      for (let d = 0; d < G.dice.length; d++) {
        if (!G.diceHeld[d]) G.dice[d] = random.D6();
      }
      G.totalRolls++;
    },
    selectScore: ({ G, ctx, events }, category) => {
      // Don't allow the category to be selected if it's already been scored.
      if (G.players[ctx.currentPlayer].scoring[category] != null) return;

      // Calculate and allocate the correct score for the selected category
      const score = ScoreCalculator.calculators[category](G.dice);
      G.players[ctx.currentPlayer].scoring[category] = score;

      // Reset the state of the dice, then end the player's turn
      G.dice = Array(totalDice).fill(1);
      G.diceHeld = Array(totalDice).fill(false);
      G.totalRolls = 0;
      events.endTurn();
    },
    toggleDie: ({ G }, dieIndex) => {
      // Don't allow the holding or unholding of die if the player hasn't rolled yet or has finished rolling
      if (G.totalRolls === 0 || G.totalRolls >= 3) return;

      // Flip from held to not held, or not held to held
      G.diceHeld[dieIndex] = !G.diceHeld[dieIndex];
    },
  },
  endIf: ({ G }) => {
    // If all players have all scoring categories set, the game is over
    const gameIsOver = G.players.every((p) => {
      return Object.keys(p.scoring).every((category) => {
        const scoringCategory = category;
        return p.scoring[scoringCategory] != null;
      });
    });
    if (gameIsOver) {
      // Calculate scores and determine the winner
      const scores = G.players.map((p) => ScoreCalculator.calculateTotal(p));
      const topScore = max(scores) ?? 0;
      if (scores.filter((score) => score === topScore).length >= 2) {
        return { draw: true };
      } else {
        const winner = G.players[scores.indexOf(topScore)];
        return { winner: winner.id };
      }
    }
  },
};

const scoringCategories = [
  { key: 'ones', label: 'Ones' },
  { key: 'twos', label: 'Twos' },
  { key: 'threes', label: 'Threes' },
  { key: 'fours', label: 'Fours' },
  { key: 'fives', label: 'Fives' },
  { key: 'sixes', label: 'Sixes' },
  { key: 'onePair', label: 'One Pair' },
  { key: 'twoPairs', label: 'Two Pairs' },
  { key: 'threeOfAKind', label: 'Three of a Kind' },
  { key: 'fourOfAKind', label: 'Four of a Kind' },
  { key: 'smallStraight', label: 'Small Straight' },
  { key: 'largeStraight', label: 'Large Straight' },
  { key: 'fullHouse', label: 'Full House' },
  { key: 'chance', label: 'Chance' },
  { key: 'yatzy', label: 'Yatzy' },
];

export const app = createApp({
  setup() {
    const G = inject('G');
    const ctx = inject('ctx');
    const moves = inject('moves');

    // Define player colors
    const playerColors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-red-500',
    ];

    // Computed properties
    const dice = computed(() => G.value.dice);
    const diceHeld = computed(() => G.value.diceHeld);
    const players = computed(() => G.value.players);
    const totalRolls = computed(() => G.value.totalRolls);
    const currentPlayer = computed(() => ctx.value.currentPlayer);

    const validCategories = computed(() => {
      const playerScoring = players.value[currentPlayer.value].scoring;
      return new Set(
        scoringCategories.filter(
          (scoringCategory) => playerScoring[scoringCategory.key] === null,
        ),
      );
    });

    return {
      dice,
      diceHeld,
      players,
      totalRolls,
      currentPlayer,
      playerColors,
      scoringCategories,
      validCategories,
      rollDice: () => moves.rollDice(),
      toggleDie: (index) => moves.toggleDie(index),
      selectScore: (category) => moves.selectScore(category),
    };
  },
  template: `
    <div class="flex pt-8 justify-center bg-gray-100 min-h-screen">
      <div class="w-full max-w-4xl p-8">
        <div class="flex flex-row flex-wrap gap-4 mb-16">
          <div 
            v-for="(player, index) in players" 
            :key="player.id"
            class="p-2 rounded-sm grow"
            :class="[
              playerColors[index % playerColors.length],
              currentPlayer === player.id ? 'opacity-100' : 'opacity-50'
            ]"
          >
            <div class="bg-white p-2 rounded">
              <div class="grid grid-cols-3 gap-1 text-xs">
                <template v-for="category in scoringCategories" :key="category.key">
                  <span 
                    class="text-center"
                    :class="{
                      'text-gray-300': player.scoring[category.key] === null,
                      'font-bold': player.scoring[category.key] !== null
                    }"
                  >
                    {{ player.scoring[category.key] ?? '-' }}
                  </span>
                </template>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-5 gap-4 mb-8 justify-items-center">
          <button
            v-for="(die, index) in dice"
            :key="index"
            @click="toggleDie(index)"
            class="hover:cursor-pointer flex items-center justify-center w-20 h-20 text-4xl font-bold transition-all duration-200 rounded-sm"
            :disabled="totalRolls === 0"
            :class="[
              diceHeld[index] ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300',
              { 'rotate-12': diceHeld[index] }
            ]"
          >
            <template v-if="totalRolls === 0">?</template>
            <template v-else-if="die === 1">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 12h.01" />
              </svg>
            </template>
            <template v-else-if="die === 2">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 9h.01" />
                <path d="M9 15h.01" />
              </svg>
            </template>
            <template v-else-if="die === 3">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 8h.01" />
                <path d="M12 12h.01" />
                <path d="M8 16h.01" />
              </svg>
            </template>
            <template v-else-if="die === 4">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 8h.01" />
                <path d="M8 8h.01" />
                <path d="M8 16h.01" />
                <path d="M16 16h.01" />
              </svg>
            </template>
            <template v-else-if="die === 5">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 8h.01" />
                <path d="M8 8h.01" />
                <path d="M8 16h.01" />
                <path d="M16 16h.01" />
                <path d="M12 12h.01" />
              </svg>
            </template>
            <template v-else-if="die === 6">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 8h.01" />
                <path d="M16 12h.01" />
                <path d="M16 16h.01" />
                <path d="M8 8h.01" />
                <path d="M8 12h.01" />
                <path d="M8 16h.01" />
              </svg>
            </template>
          </button>
        </div>

        <div class="flex justify-center mb-8">
          <div class="flex flex-col items-center gap-3">
            <button 
              @click="rollDice"
              :disabled="totalRolls >= 3"
              class="px-6 py-2 text-black rounded border-l-0 disabled:opacity-50"
            >
              Roll Dice
            </button>

            <div class="flex flex-row gap-2">
              <div
                v-for="(n, index) in 3"
                :key="index"
                class="h-2 w-2 rounded-full bg-slate-800 transition-colors"
                :class="[index < totalRolls && 'bg-transparent']"
              ></div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-3 justify-items-start border-l-4 border-l-pink-300">
          <button
              v-for="category in scoringCategories"
              :key="category.key"
              @click="selectScore(category.key)"
              :disabled="!validCategories.has(category)"
              class="border w-full py-2 px-2 text-black border-b-2 border-b-blue-200 hover:border-b-blue-500 transition-colors"
              :class="[!validCategories.has(category) && 'opacity-25 select-none pointer-events-none']"
            >
              {{ category.label }}
            </button>
        </div>
      </div>
    </div>
  `,
});
