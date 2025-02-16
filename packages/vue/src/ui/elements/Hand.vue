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
    group="items"
    class="relative flex flex-row items-center justify-center flex-nowrap touch-none"
    :sort="false"
    :animation="150"
    @end="(event$: SortableEvent) => play(event$, event$.oldIndex)"
  >
    <div
      v-for="(element, index) in currentHand"
      class="relative top-0 left-0"
      :style="{
        marginLeft: '-4%',
      }"
    >
      <component
        v-bind="element"
        :is="component"
        :style="{}"
        @mouseup="(event$: Event) => clickable && play(event$ as DragEvent, index)"
      />
    </div>
  </VueDraggable>
</template>
