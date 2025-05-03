<script lang="ts" setup>
import PrimeButton from 'primevue/button';
</script>
<template>
  <PrimeButton
    type="button"
    v-bind="$props"
    v-ripple
  />
</template>
