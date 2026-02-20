import { connect } from '@kossabos/mcp';
import { createApp, computed, ref } from 'vue';

const games = await connect('kossabos/games');

const isDev = process.env.ENVIRONMENT === 'development';

/** @see https://github.com/words/syllable */

const problematic = {
  abalone: 4,
  abare: 3,
  abbruzzese: 4,
  abed: 2,
  aborigine: 5,
  abruzzese: 4,
  acreage: 3,
  adame: 3,
  adieu: 2,
  adobe: 3,
  anemone: 4,
  anyone: 3,
  apache: 3,
  aphrodite: 4,
  apostrophe: 4,
  ariadne: 4,
  cafe: 2,
  calliope: 4,
  catastrophe: 4,
  chile: 2,
  chloe: 2,
  circe: 2,
  coyote: 3,
  daphne: 2,
  epitome: 4,
  eurydice: 4,
  euterpe: 3,
  every: 2,
  everywhere: 3,
  forever: 3,
  gethsemane: 4,
  guacamole: 4,
  hermione: 4,
  hyperbole: 4,
  jesse: 2,
  jukebox: 2,
  karate: 3,
  machete: 3,
  maybe: 2,
  naive: 2,
  newlywed: 3,
  penelope: 4,
  people: 2,
  persephone: 4,
  phoebe: 2,
  pulse: 1,
  queue: 1,
  recipe: 3,
  riverbed: 3,
  sesame: 3,
  shoreline: 2,
  simile: 3,
  snuffleupagus: 5,
  sometimes: 2,
  syncope: 3,
  tamale: 3,
  waterbed: 3,
  wednesday: 2,
  yosemite: 4,
  zoe: 2
};

const own = {}.hasOwnProperty

// Two expressions of occurrences which normally would be counted as two
// syllables, but should be counted as one.
const EXPRESSION_MONOSYLLABIC_ONE = new RegExp(
  [
    'awe($|d|so)',
    'cia(?:l|$)',
    'tia',
    'cius',
    'cious',
    '[^aeiou]giu',
    '[aeiouy][^aeiouy]ion',
    'iou',
    'sia$',
    'eous$',
    '[oa]gue$',
    '.[^aeiuoycgltdb]{2,}ed$',
    '.ely$',
    '^jua',
    'uai',
    'eau',
    '^busi$',
    '(?:[aeiouy](?:' +
      [
        '[bcfgklmnprsvwxyz]',
        'ch',
        'dg',
        'g[hn]',
        'lch',
        'l[lv]',
        'mm',
        'nch',
        'n[cgn]',
        'r[bcnsv]',
        'squ',
        's[chkls]',
        'th'
      ].join('|') +
      ')ed$)',
    '(?:[aeiouy](?:' +
      [
        '[bdfklmnprstvy]',
        'ch',
        'g[hn]',
        'lch',
        'l[lv]',
        'mm',
        'nch',
        'nn',
        'r[nsv]',
        'squ',
        's[cklst]',
        'th'
      ].join('|') +
      ')es$)'
  ].join('|'),
  'g'
)

const EXPRESSION_MONOSYLLABIC_TWO = new RegExp(
  '[aeiouy](?:' +
    [
      '[bcdfgklmnprstvyz]',
      'ch',
      'dg',
      'g[hn]',
      'l[lv]',
      'mm',
      'n[cgns]',
      'r[cnsv]',
      'squ',
      's[cklst]',
      'th'
    ].join('|') +
    ')e$',
  'g'
)

// Four expression of occurrences which normally would be counted as one
// syllable, but should be counted as two.
const EXPRESSION_DOUBLE_SYLLABIC_ONE = new RegExp(
  '(?:' +
    [
      '([^aeiouy])\\1l',
      '[^aeiouy]ie(?:r|s?t)',
      '[aeiouym]bl',
      'eo',
      'ism',
      'asm',
      'thm',
      'dnt',
      'snt',
      'uity',
      'dea',
      'gean',
      'oa',
      'ua',
      'react?',
      'orbed', // Cancel `'.[^aeiuoycgltdb]{2,}ed$',`
      'shred', // Cancel `'.[^aeiuoycgltdb]{2,}ed$',`
      'eings?',
      '[aeiouy]sh?e[rs]'
    ].join('|') +
    ')$',
  'g'
)

const EXPRESSION_DOUBLE_SYLLABIC_TWO = new RegExp(
  [
    'creat(?!u)',
    '[^gq]ua[^auieo]',
    '[aeiou]{3}',
    '^(?:ia|mc|coa[dglx].)',
    '^re(app|es|im|us)',
    '(th|d)eist'
  ].join('|'),
  'g'
)

const EXPRESSION_DOUBLE_SYLLABIC_THREE = new RegExp(
  [
    '[^aeiou]y[ae]',
    '[^l]lien',
    'riet',
    'dien',
    'iu',
    'io',
    'ii',
    'uen',
    '[aeilotu]real',
    'real[aeilotu]',
    'iell',
    'eo[^aeiou]',
    '[aeiou]y[aeiou]'
  ].join('|'),
  'g'
)

const EXPRESSION_DOUBLE_SYLLABIC_FOUR = /[^s]ia/

// Expression to match single syllable pre- and suffixes.
const EXPRESSION_SINGLE = new RegExp(
  [
    '^(?:' +
      [
        'un',
        'fore',
        'ware',
        'none?',
        'out',
        'post',
        'sub',
        'pre',
        'pro',
        'dis',
        'side',
        'some'
      ].join('|') +
      ')',
    '(?:' +
      [
        'ly',
        'less',
        'some',
        'ful',
        'ers?',
        'ness',
        'cians?',
        'ments?',
        'ettes?',
        'villes?',
        'ships?',
        'sides?',
        'ports?',
        'shires?',
        '[gnst]ion(?:ed|s)?'
      ].join('|') +
      ')$'
  ].join('|'),
  'g'
)

// Expression to match double syllable pre- and suffixes.
const EXPRESSION_DOUBLE = new RegExp(
  [
    '^' +
      '(?:' +
      [
        'above',
        'anti',
        'ante',
        'counter',
        'hyper',
        'afore',
        'agri',
        'infra',
        'intra',
        'inter',
        'over',
        'semi',
        'ultra',
        'under',
        'extra',
        'dia',
        'micro',
        'mega',
        'kilo',
        'pico',
        'nano',
        'macro',
        'somer'
      ].join('|') +
      ')',
    '(?:fully|berry|woman|women|edly|union|((?:[bcdfghjklmnpqrstvwxz])|[aeiou])ye?ing)$'
  ].join('|'),
  'g'
)

// Expression to match triple syllable suffixes.
const EXPRESSION_TRIPLE = /(creations?|ology|ologist|onomy|onomist)$/g

/**
 * Count syllables in `value`.
 *
 * @param {string} value
 *   Value to check.
 * @returns {number}
 *   Syllables in `value`.
 */
function getSyllableCount(value) {
  const values = String(value)
    .toLowerCase()
    // Remove apostrophes.
    .replace(/['’]/g, '')
    // Split on word boundaries.
    .split(/\b/g)
  let index = -1
  let sum = 0

  while (++index < values.length) {
    // Remove non-alphabetic characters from a given value.
    sum += one(values[index].replace(/[^a-z]/g, ''))
  }

  return sum
}

/**
 * Get syllables in a word.
 *
 * @param {string} value
 * @returns {number}
 */
function one(value) {
  let count = 0

  if (value.length === 0) {
    return count
  }

  // Return early when possible.
  if (value.length < 3) {
    return 1
  }

  // If `value` is a hard to count, it might be in `problematic`.
  if (own.call(problematic, value)) {
    return problematic[value]
  }

  const addOne = returnFactory(1)
  const subtractOne = returnFactory(-1)

  // Count some prefixes and suffixes, and remove their matched ranges.
  value = value
    .replace(EXPRESSION_TRIPLE, countFactory(3))
    .replace(EXPRESSION_DOUBLE, countFactory(2))
    .replace(EXPRESSION_SINGLE, countFactory(1))

  // Count multiple consonants.
  const parts = value.split(/[^aeiouy]+/)
  let index = -1

  while (++index < parts.length) {
    if (parts[index] !== '') {
      count++
    }
  }

  // Subtract one for occurrences which should be counted as one (but are
  // counted as two).
  value
    .replace(EXPRESSION_MONOSYLLABIC_ONE, subtractOne)
    .replace(EXPRESSION_MONOSYLLABIC_TWO, subtractOne)

  // Add one for occurrences which should be counted as two (but are counted as
  // one).
  value
    .replace(EXPRESSION_DOUBLE_SYLLABIC_ONE, addOne)
    .replace(EXPRESSION_DOUBLE_SYLLABIC_TWO, addOne)
    .replace(EXPRESSION_DOUBLE_SYLLABIC_THREE, addOne)
    .replace(EXPRESSION_DOUBLE_SYLLABIC_FOUR, addOne)

  // Make sure at least on is returned.
  return count || 1

  /**
   * Define scoped counters, to be used in `String#replace()` calls.
   * The scoped counter removes the matched value from the input.
   *
   * @param {number} addition
   */
  function countFactory(addition) {
    return counter
    /**
     * @returns {string}
     */
    function counter() {
      count += addition
      return ''
    }
  }

  /**
   * This scoped counter does not remove the matched value from the input.
   *
   * @param {number} addition
   */
  function returnFactory(addition) {
    return returner
    /**
     * @param {string} $0
     * @returns {string}
     */
    function returner($0) {
      count += addition
      return $0
    }
  }
}

const NUM_VOTES = 3;

const toLine = (syllableCounts, offset, numSyllables) => {
  let line = undefined;
  let wordCount = 0;
  let currSyllableCount = 0;
  
  try {
    const counts = syllableCounts.slice(offset);
    if (!counts.length) {
      return { line: '', wordCount: 0, syllableCount: 0 };
    }

    do {
      const { word, count } = counts.shift();
      currSyllableCount += count;
      wordCount += 1;
      if (line === undefined) {
        line = word;
      } else {
        line += ' ' + word;
      }
    } while (currSyllableCount < numSyllables);
    return { line, wordCount, syllableCount: currSyllableCount };
  } catch {
    return { line, wordCount, syllableCount: currSyllableCount };
  }
};

const SAMPLE_POEM = 'The sun is shining\nBirds are singing in the trees\nNature wakes from sleep';
const SAMPLE_POEMS = [
  SAMPLE_POEM,
  'A gentle breeze blows\nWhispers through the tall green grass\nNature’s lullaby',
  'Mountains touch the sky\nClouds drift lazily above\nNature’s majesty',
];

export const app = createApp({
  setup() {
    const data = computed(() => games.get_daily_data());
    const users = computed(() => games.get_voting_pool());

    const poem = ref(isDev ? SAMPLE_POEM : '');
    const prompt = computed(() => data?.prompt || 'Write a haiku.');
    const poems = computed(() => {
      if (isDev.value) {
        return SAMPLE_POEMS;
      }

      // Use user-provided poems if available
      const userProvidedPoems = [];
      users.value.map((user) => user?.data?.poem).forEach((userPoem) => {
        if (userPoem && userPoem.trim() !== '') {
          userProvidedPoems.push(userPoem);
        }
      });

      // Add system-generated poems as backup
      const systemGeneratedPoems = data.value?.examples || [];

      // Fallback to sample poems
      return [...userProvidedPoems, ...systemGeneratedPoems, ...SAMPLE_POEMS].slice(0, NUM_VOTES);
  });

    const phase = ref('creating'); // 'creating', 'voting'
    const voteNum = ref(1);
    const votes = ref([]); // { userId: value }
    const currentVote = ref(5);
    const isComplete = ref(false);
    const lineCounts = ref({
      0: 0, // 5 syllables
      1: 0, // 7 syllables
      2: 0, // 5 syllables
    });

    const nextPoem = () => {
      poem.value = poems.value.pop();
    };

    const submitVotes = () => {
      const sortedVotes = votes.value.sort((a, b) => b.score - a.score);
      const votes = sortedVotes.map((vote, index) => ({
        place: index + 1,
        userId: vote.userId,
        score: vote.score,
      }));
      const data = { poem: poem.value };
      games.vote({ votes, data });
    }

    const vote = (userId, score) => {
      votes.value.push({ userId, score });
      voteNum.value += 1;
      if (voteNum.value >= NUM_VOTES) {
        submitVotes();
        return;
      }

      nextPoem();
    };
    const submit = () => {
      games.submit({ value: poem.value });
      phase.value = 'voting';
      nextPoem();
    };

    const setIsComplete = (value) => {
      isComplete.value = value;
    }

    const setLineCount = (lineNum, count) => {
      lineCounts.value[lineNum] = count;
    };

    const haiku = computed(() => {
      const syllableCounts = poem.value
        .split(/[ \n]/)
        .filter((word) => word.trim() !== '')
        .map((word) => {
          const count = getSyllableCount(word);
          if (count === undefined) {
            return { word, count: 1 }; // Default to 1 syllable if counting fails
          }
          return { word, count };
        });

      try {
        const lines = [];

        debugger;

        let numWords = 0;
        let { line, wordCount, syllableCount } = toLine(syllableCounts, 0, 5);
        numWords += wordCount;
        setLineCount(0, syllableCount);
        lines.push(line);

        ({ line, wordCount, syllableCount } = toLine(syllableCounts, numWords, 7));
        numWords += wordCount;
        setLineCount(1, syllableCount);
        lines.push(line);

        ({ line, wordCount, syllableCount } = toLine(syllableCounts, numWords, 5));
        setLineCount(2, syllableCount);
        lines.push(line);

        const content = lines.filter((x) => !!x).join('\n');
        const isComplete = syllableCount === 5 && lines.length === 3;
        setIsComplete(isComplete);

        return content;
      } catch (e) {
        console.error('Error creating haiku:', e);
        return '';
      }
    });

    const updatePoem = (value) => {
      if (haiku.value.isComplete && value.length > poem.value.length) {
        return;
      }
      poem.value = value;
    };

    return {
      haiku,
      voteNum,
      isComplete,
      lineCounts,
      prompt,
      currentVote,
      phase,
      totalNumVotes: NUM_VOTES,
      nextPoem,
      updatePoem,
      submit,
      vote,
      t,
    };
  },
  template: `
    <div class="flex flex-col items-center pt-8">      
      <div v-if="phase === 'creating'" class="flex flex-col items-center">
        <pre>{{ prompt }}</pre>

        <div class="flex flex-row">
          <div class="flex flex-col pt-8 pr-4 opacity-25">
            <span
              v-for="lineCount in lineCounts"
              class="border-r-2 pr-2"
            >
              {{ lineCount }}
            </span>
          </div>
          <textarea
            v-model="haiku"
            @input="updatePoem($event.target.value)"
            class="resize-none w-full max-w-md min-h-[6.5rem] pl-2 pr-8 pt-4 pb-5 bg-white my-4 mx-auto"
            style="field-sizing: content"
            placeholder="Roses are red..."
          ></textarea>
        </div>

        <!-- Display invalid lines warning -->
        <div class="text-red-500">
          <p v-if="lineCounts[0] > 5">Line 1 must have 5 syllables.</p>
          <p v-if="lineCounts[1] > 7">Line 2 must have 7 syllables.</p>
          <p v-if="lineCounts[2] > 5">Line 3 must have 5 syllables.</p>
        </div>

        <Button
          class="mt-4"
          size="small"
          icon="pi pi-send"
          :label="t('submit', 'Submit')"
          :disabled="!isComplete"
          @click="submit"
        />
      </div>

      <div v-else-if="phase === 'voting'" class="flex flex-col items-center">
        <pre
          v-model="haiku"
          class="resize-none w-full max-w-md h-[8rem] pr-8 py-4 bg-white my-4 mx-auto"
        >
          {{ haiku }}
        </pre>

        <Slider
          v-model="currentVote"
          :step="1"
          :min="1"
          :max="5"
          class="w-56"
        />

        <Badge
          :value="voteNum + ' / ' + totalNumVotes"
          @click="submit"
        />
      </div>
    </div>
  `,
});
