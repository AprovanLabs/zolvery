<script lang="ts" setup>
import { computed, defineProps, ref } from 'vue';

export type Pattern = 'striped' | 'bordered' | 'solid';
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank =
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
  | 'A';

export type Card = {
  suit: Suit;
  rank: Rank;
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
  rank,
  draggable = false,
  pattern = 'solid',
  hidden = false,
} = defineProps<{
  suit?: Suit;
  rank?: Rank;
  draggable?: boolean;
  pattern?: Pattern;
  hidden?: boolean;
}>();

const suitSymbols: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};
const suitSymbol = computed(() => suitSymbols[suit]);
const suitColor = computed(() =>
  suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black',
);

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
    @dragstart="($event) => startDrag($event, { suit, rank })"
    @dragend="() => dragEnd()"
    class="flex flex-col items-center justify-center w-16 h-24 border-4 border-black rounded-lg select-none hover:cursor-pointer"
    :style="[
      { backgroundColor: hidden ? 'currentColor' : 'white' },
      hidden && pattern === 'striped' && styles.striped,
      hidden && pattern === 'bordered' && styles.bordered,
    ]"
    v-motion
    :initial="{
      scale: 0.5,
      rotate: 0,
      opacity: 0,
      y: 0,
    }"
    :enter="{
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 15,
      },
      y: 0,
    }"
    :hovered="{
      // rotate:
      //   Math.sign(Math.random() - 0.5) * 10 * Math.min(1, Math.random() + 0.25),
      y: -5,
    }"
  >
    <span
      class="font-bold"
      :class="[suitColor === 'red' ? 'text-red-500' : 'text-black']"
      v-if="!hidden"
      >{{ rank }}</span
    >
    <span
      :class="[suitColor === 'red' ? 'text-red-500' : 'text-black']"
      v-if="!hidden"
      >{{ suitSymbol }}</span
    >
  </div>
</template>
