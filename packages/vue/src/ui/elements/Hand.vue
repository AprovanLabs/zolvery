<script lang="ts" setup>
import { defineProps, computed, ref } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import type { SortableEvent } from 'vue-draggable-plus';

const {
  hand,
  component,
  clickable = false,
} = defineProps<{
  hand: object[];
  component: string;
  clickable?: boolean;
}>();

const emit = defineEmits<{
  (e: 'play', item: object): void;
}>();

const currentHand = ref(hand);

const play = computed(
  () => (event: Event | SortableEvent, playIndex: number) => {
    const element = currentHand.value[playIndex];
    if (event.type === 'mouseup') {
      currentHand.value = currentHand.value.filter(
        (_, index) => index !== playIndex,
      );
    }
    emit('play', element);
  },
);
</script>

<template>
  <VueDraggable
    v-model="currentHand"
    :animation="150"
    group="items"
    class="flex flex-row items-center justify-center space-x-2 touch-none"
    @end="(event$: SortableEvent) => play(event$, event$.oldIndex)"
  >
    <component
      v-for="(element, index) in currentHand"
      v-bind="element"
      :is="component"
      @mouseup="(event$: Event) => clickable && play(event$ as DragEvent, index)"
    />
  </VueDraggable>
</template>
