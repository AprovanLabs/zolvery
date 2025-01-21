<script lang="ts" setup>
import { computed, defineProps, ref } from 'vue';

const { shape, dimensions, component } = defineProps<{
  shape: number | [number, number];
  dimensions: [string | number, string | number];
  component: string;
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

const componentProps = ref([]);
const full = computed(() => componentProps.value.length === n.value * m.value);

const onDrop = computed(() => (event: DragEvent) => {
  dragHovered.value = false;
  event.dataTransfer.dropEffect = full.value ? 'none' : 'move';

  if (full.value) {
    return;
  }

  const props = JSON.parse(event.dataTransfer.getData('props'));
  componentProps.value.push(props);
});

const dragHovered = ref(false);

const elements = computed(() =>
  Array.from({ length: n.value * m.value }, (_, index) => ({
    index,
    props: componentProps.value[index],
  })),
);

const onDragOver = computed(() => (event: DragEvent) => {
  dragHovered.value = true;
  event.dataTransfer.dropEffect = full.value ? 'none' : 'move';
});
</script>

<template>
  <div
    class="grid gap-2"
    :style="`grid-template-columns: repeat(${m}, ${width}); grid-template-rows: repeat(${height}, ${n})`"
  >
    <div
      v-for="element in elements"
      class="relative transition-all ease-in-out rounded-md bg-slate-200"
      :class="[!full && dragHovered ? 'bg-slate-300' : 'bg-slate-200']"
      :style="`width: ${width}; height: ${height}`"
      @dragover="onDragOver"
      @dragleave="dragHovered = false"
      @dragover.prevent
      @dragenter.prevent
      @drop="onDrop($event)"
    >
      <component
        class="absolute top-0 left-0 pointer-events-none select-non"
        v-if="element.props"
        :is="component"
        v-bind="element.props"
      />
    </div>
    <slot></slot>
  </div>
</template>
