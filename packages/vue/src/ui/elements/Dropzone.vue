<script lang="ts" setup>
import { Ref } from 'vue';
import { computed, watch, defineProps, ref } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import { useElementBounding } from '@vueuse/core';

const { shape, dimensions, component, label } = defineProps<{
  shape: number | [number, number];
  dimensions: [string | number, string | number];
  component: string;
  label?: string;
}>();

// Default to x by 1 grid
const n = computed(() => (Array.isArray(shape) ? shape[1] : 1));
const m = computed(() => (Array.isArray(shape) ? shape[0] : shape));

const width = computed(() =>
  typeof dimensions[0] === 'number' ? `${dimensions[0]}px` : dimensions[0],
);
const height = computed(() =>
  typeof dimensions[1] === 'number' ? `${dimensions[1]}px` : dimensions[1],
);

const dragHovered = ref(false);

const onDragOver = computed(() => (event: DragEvent) => {
  dragHovered.value = true;
});

const elements = ref(
  Array.from({ length: n.value * m.value }).map(() => null as unknown),
) as Ref<object[]>;

const full = computed(() => elements.value.length >= n.value * m.value * 2);

const draggable = ref(null);
const { top, right, bottom, left } = useElementBounding(draggable);
const onTouchMove = computed(() => (event: TouchEvent) => {
  const { pageX, pageY } = event.targetTouches[0];
  if (
    pageX < left.value ||
    pageX > right.value ||
    pageY < top.value ||
    pageY > bottom.value
  ) {
    dragHovered.value = false;
  } else if (
    pageX > left.value &&
    pageX < right.value &&
    pageY > top.value &&
    pageY < bottom.value
  ) {
    dragHovered.value = true;
  }
});

// Reset hover state on element change
// Required for touch handling
watch(elements, () => {
  dragHovered.value = false;
});
</script>

<template>
  <div class="relative">
    <div
      v-if="label"
      class="h-2 mt-2 -translate-y-2 border-t-2 border-l-2 border-r-2 rounded-tl-sm rounded-tr-sm border-t-black border-r-black border-l-black"
    >
      <div
        class="absolute px-2 text-xs font-bold -translate-x-1/2 bg-white left-1/2 -top-2"
      >
        {{ label }}
      </div>
    </div>

    <VueDraggable
      ref="draggable"
      v-model="elements"
      ghost-class="hidden"
      group="items"
      class="grid gap-2 select-none"
      :animation="150"
      :delay="250"
      :class="[
        full && 'pointer-events-none select-none hover:cursor-not-allowed',
      ]"
      :style="`grid-template-columns: repeat(${m}, ${width}); grid-template-rows: repeat(${height}, ${n})`"
      @dragover="onDragOver"
      @touchmove="onTouchMove"
      @dragleave="dragHovered = false"
      @dragover.prevent
      @dragenter.prevent
    >
      <div
        v-for="element in elements.sort().slice(0, n * m)"
        class="relative transition-all ease-in-out rounded-md bg-slate-200"
        :class="[!full && dragHovered ? 'bg-slate-300' : 'bg-slate-200']"
        :style="`width: ${width}; height: ${height}`"
      >
        <component
          class="absolute top-0 left-0 pointer-events-none"
          v-if="element"
          :is="component"
          v-bind="element"
        />
      </div>
    </VueDraggable>
  </div>
</template>
