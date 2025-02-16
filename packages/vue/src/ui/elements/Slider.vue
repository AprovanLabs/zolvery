<script lang="ts" setup>
import PrimeSlider from 'primevue/slider';
</script>
<template>
  <PrimeSlider
    :pt="{
      range: '!h-[0.3rem] transition-all ease-out duration-75',
      root: '!h-[0.3rem] rounded',
      handle:
        '!outline-[0.3rem] !outline-offset-[-0.25rem] transition-all ease-out duration-75 w-6 h-6 !mt-[-0.75rem] before:h-4 before:w-4',
    }"
    v-bind="$props"
  />
</template>
