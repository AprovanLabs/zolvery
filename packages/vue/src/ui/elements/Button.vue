<script lang="ts" setup>
import PrimeButton from 'primevue/button';
</script>
<template>
  <PrimeButton
    class="border-4"
    type="button"
    :pt="{
      root: 'border-solid border-black font-bold hover:enabled:border-black  transition-all ease-in-out translate-y-0',
      label: 'font-bold',
    }"
    v-bind="$props"
    v-ripple
  />
</template>
