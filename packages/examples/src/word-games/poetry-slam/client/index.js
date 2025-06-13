import { createApp, computed, inject, ref } from 'vue';

const NUM_VOTES = 3;

const getSyllableCount = (word) => {
  word = word.toLowerCase();
  const tSome = 0;
  if (word.length > 3) {
    if (word.substring(0, 4) == 'some') {
      word = word.replace('some', '');
      tSome++;
    }
  }

  word = word.replace(/(?:[^laeiouy]|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');

  const syl = word.match(/[aeiouy]{1,2}/g);
  console.log(syl);
  if (syl) {
    return syl.length + tSome;
  }
};

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
      console.log('Current syllable counts:', counts);
      const { word, count } = counts.shift();
      currSyllableCount += count;
      console.log(
        'Current syllable count:',
        currSyllableCount,
        'for word:',
        word,
      );

      // if (currSyllableCount > numSyllables) {
      //   throw new Error(`Exceeded ${numSyllables} syllables in line: ${line} + ${word}`);
      // }

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

export const app = createApp({
  setup() {
    const { on, store, emit, t } = inject('kossabos');

    const poem = ref('');
    const prompt = computed(() => store?.get('prompt') || 'Write a haiku.');
    const poems = computed(() => store?.get('poems') || []);
    const phase = ref('creating'); // 'creating', 'voting'
    const voteNum = ref(1);
    const currentVote = ref(5);
    const isComplete = ref(false);
    const invalidLines = ref(new Set());

    const nextPoem = () => {
      poem.value = poems.value.pop();
    };

    const vote = (userId, value) => {
      emit('score', { userId, value });
      voteNum.value += 1;
      if (voteNum.value >= NUM_VOTES) {
        emit('end');
      } else {
        nextPoem();
      }
    };

    const submit = () => {
      emit('submit', { value: poem.value });
      phase.value = 'voting';
      nextPoem();
    };

    const setIsComplete = (value) => {
      isComplete.value = value;
    }

    const setInvalidLines = (invalidLines) => {
      invalidLines.value = invalidLines;
    }

    const haiku = computed(() => {
      const syllableCounts = poem.value
        .split(/[ \n]/)
        .filter((word) => word.trim() !== '')
        .map((word) => {
          const count = getSyllableCount(word);
          console.log('Counting syllables for word:', { word, count });
          if (count === undefined) {
            console.warn(`Could not count syllables for word: ${word}`);
            return { word, count: 1 }; // Default to 1 syllable if counting fails
          }
          return { word, count };
        });

      try {
        const lines = [];

        console.log('Syllable counts:', [...syllableCounts]);
        debugger;

        const invalidLines = new Set();
        let numWords = 0;
        let { line, wordCount, syllableCount } = toLine(syllableCounts, 0, 5);
        numWords += wordCount;
        console.log('First line:', line, syllableCount);
        if (syllableCount !== 5) {
          invalidLines.add(0);
        }
        lines.push(line);

        ({ line, wordCount, syllableCount } = toLine(syllableCounts, numWords, 7));
        numWords += wordCount;
        if (syllableCount !== 7) {
          invalidLines.add(1);
        }
        lines.push(line);

        ({ line, wordCount, syllableCount } = toLine(syllableCounts, numWords, 5));
        if (syllableCount !== 5) {
          invalidLines.add(1);
        }
        lines.push(line);

        console.log('Haiku syllable counts:', lines);

        const content = lines.filter((x) => !!x).join('\n');
        const isComplete = syllableCount === 5;

        console.log('content', content, isComplete);

        setIsComplete(isComplete);
        setInvalidLines(invalidLines);

        return content;
      } catch (e) {
        console.error('Error creating haiku:', e);
        return '';
      }
    });

    const updatePoem = (value) => {
      console.log('Updating poem:', haiku.value, value);
      if (haiku.value.isComplete && value.length > poem.value.length) {
        return;
      }
      poem.value = value;
    };

    return {
      haiku,
      isComplete,
      invalidLines,
      prompt,
      currentVote,
      phase,
      updatePoem,
      submit,
      vote,
      t,
    };
  },
  template: `
    <div class="flex flex-col items-center">
      <pre>{{ prompt }}</pre>

      <div v-if="phase === 'creating'">
        <textarea
          v-model="haiku"
          @input="updatePoem($event.target.value)"
          class="w-full max-w-md h-32 px-8 py-4 bg-white my-4 mx-auto"
          placeholder="Write your poem here..."
        ></textarea>
        {{invalidLines}}

        <!-- Display invalid lines warning -->
        <div v-if="!isComplete" class="text-red-500">
          <p v-if="invalidLines.has(0)">Line 1 must have 5 syllables.</p>
          <p v-if="invalidLines.has(1)">Line 2 must have 7 syllables.</p>
          <p v-if="invalidLines.has(2)">Line 3 must have 5 syllables.</p>
        </div>

        <button
          class="btn btn-primary mt-2"
          :disabled="!isComplete"
          :class="[haiku.isComplete ? '' : 'opacity-50']"
          @click="submit"
        >
          {{ t('submit', 'Submit') }}
        </button>
      </div>

      <div v-else-if="phase === 'voting'">

        <Slider
          v-model="currentVote"
          :step="1"
          :min="1"
          :max="5"
          class="w-56"
        />

        <Badge
          :value="voteNum + '/' + NUM_VOTES"
          @click="submit"
        />
      </div>
    <div>
  `,
});
