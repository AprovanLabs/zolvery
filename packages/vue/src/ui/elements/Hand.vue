<script lang="ts" setup>
import { defineProps, computed, ref } from 'vue';

import Fanout from '../layouts/Fanout.vue';

const {
  hand,
  component,
  clickable = false,
} = defineProps<{
  hand: object[];
  component: string;
  clickable?: boolean;
}>();

const currentHand = ref(hand);

const emit = defineEmits<{
  (e: 'play', item: object): void;
}>();

const play = computed(() => (event: DragEvent, playIndex: number) => {
  console.log('drop effect', event.dataTransfer?.dropEffect);
  if (event.dataTransfer?.dropEffect !== 'move') {
    return;
  }
  currentHand.value = currentHand.value.filter(
    (_, index) => index !== playIndex,
  );
  emit('play', event);
});
</script>

<template>
  <Fanout>
    <component
      v-for="(item, index) in currentHand"
      v-bind="item"
      :is="component"
      @click="(event$: Event) => clickable && play(event$ as DragEvent, index)"
      @dragend="(event$: DragEvent) => play(event$, index)"
    />
  </Fanout>
</template>
