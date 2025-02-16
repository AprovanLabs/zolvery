<script lang="ts" setup>
import { computed, defineProps, ref } from 'vue';

export type Pattern = 'striped' | 'bordered' | 'solid';
export type Suit =
  | 'hearts'
  | 'diamonds'
  | 'clubs'
  | 'spades'
  // Jokers
  | 'big'
  | 'little';
export type Name =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A'
  | 'Joker';

export type Card = {
  suit?: Suit;
  name: Name;
};

const styles: Record<Pattern, Record<string, string>> = {
  bordered: {
    background:
      'radial-gradient(currentColor 0px, currentColor 50%, lch(from currentColor calc(l - 20) c h) 50%, lch(from currentColor calc(l - 20) c h) 100%)',
  },
  striped: {
    background:
      'repeating-linear-gradient(45deg, currentColor 0%, currentColor 25%, lch(from currentColor calc(l - 20) c h) 25%, lch(from currentColor calc(l - 20) c h) 50%)',
  },
  solid: { background: 'currentColor' },
};

const {
  suit,
  name,
  disabled = false,
  draggable = false,
  pattern = 'solid',
  hidden = false,
} = defineProps<{
  suit?: Suit;
  name?: Name;
  disabled?: boolean;
  draggable?: boolean;
  pattern?: Pattern;
  hidden?: boolean;
}>();

const suitSymbols: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  big: '',
  little: '',
};
const suitSymbol = computed(() => suitSymbols[suit]);
const suitColor = computed(() =>
  suit === 'hearts' || suit === 'diamonds' || suit === 'big' ? 'red' : 'black',
);
const nameSymbol = computed(() => {
  // Joker
  if (suit === 'big' || suit === 'little') {
    // 🃏
    return '🃟';
  }
  return name;
});

const componentRef = ref(null);

const startDrag = (event: DragEvent, props: object) => {
  event.dataTransfer.dropEffect = 'move';
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('props', JSON.stringify(props));
};

const dragEnd = computed(() => () => {
  if (!componentRef.value) {
    return;
  }
  componentRef.value.dispatchEvent(new Event('click'));
});
</script>

<template>
  <div
    ref="componentRef"
    :draggable="draggable"
    @dragstart="($event) => startDrag($event, { suit, name })"
    @dragend="() => dragEnd()"
    disabled="disabled"
    class="flex flex-col items-center justify-center w-16 h-24 border-4 border-black rounded-lg select-none hover:cursor-pointer"
    :style="[
      { backgroundColor: hidden ? 'currentColor' : 'white' },
      hidden && pattern === 'striped' && styles.striped,
      hidden && pattern === 'bordered' && styles.bordered,
      disabled && { filter: 'brightness(0.6)', borderColor: 'gray' },
    ]"
    v-motion
    :initial="{
      opacity: 0,
      y: 0,
    }"
    :enter="{
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 15,
      },
      y: 0,
    }"
    :hovered="{ y: -7 }"
  >
    <!-- Top Left -->
    <div
      class="absolute top-0 flex flex-col items-center font-bold leading-5 left-1"
      :class="[suitColor === 'red' ? 'text-red-500' : 'text-black']"
      v-if="!hidden"
    >
      <span class="font-bold">{{ nameSymbol }}</span>
      <span>{{ suitSymbol }}</span>
    </div>

    <!-- Bottom Right -->
    <!-- <div
      class="absolute bottom-0 flex flex-col items-center font-bold leading-5 rotate-180 right-1"
      :class="[suitColor === 'red' ? 'text-red-500' : 'text-black']"
      v-if="!hidden"
    >
      <span class="font-bold">{{ name }}</span>
      <span>{{ suitSymbol }}</span>
    </div> -->
  </div>
</template>
