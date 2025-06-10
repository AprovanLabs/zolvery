import { createApp, computed, inject, ref } from 'vue';

const NUM_VOTES = 3;

const syllableCount = (word) => {
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

const toLine = (syllableCounts, numSyllables) => {
  try {
    if (!syllableCounts.length) {
      throw new Error('No syllable counts provided for line construction');
    }

    const counts = [...syllableCounts];
    let currSyllableCount = 0;
    let line;
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
      if (currSyllableCount > 5) {
        throw new Error(`Exceeded 5 syllables in line: ${line} + ${word}`);
      }

      if (line === undefined) {
        line = word;
      } else {
        line += ' ' + word;
      }
    } while (currSyllableCount < numSyllables);
    return line;
  } catch (e) {
    console.error('Error creating line:', e);
    return '';
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

    const haiki = computed(() => {
      const syllableCounts = poem.value
        .split(' ')
        .filter((word) => word.trim() !== '')
        .map((word) => {
          const count = syllableCount(word);
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

        lines.push(toLine([...syllableCounts], 5));
        lines.push(toLine([...syllableCounts], 7));
        lines.push(toLine([...syllableCounts], 5));

        console.log('Haiku syllable counts:', lines);

        return lines.join('\n');
      } catch (e) {
        console.error('Error creating haiku:', e);
        return '';
      }
    });

    const updatePoem = (value) => {
      console.log('Updating poem:', value);
      poem.value = value;
    };

    return {
      haiki,
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
          v-model="haiki"
          @input="updatePoem($event.target.value)"
          class="w-full max-w-sm h-32 px-16 py-8 bg-white my-4 mx-auto"
          placeholder="Write your poem here..."
        ></textarea>

        <button
          class="btn btn-primary mt-2"
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
