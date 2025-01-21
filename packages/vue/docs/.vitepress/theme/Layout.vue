<script setup>
import { onMounted } from 'vue';
import DefaultTheme from 'vitepress/theme';

onMounted(() => {
  ['https://cdn.jsdelivr.net/npm/heroicons-css@0.1.1/heroicons.min.js'].forEach(
    (script) => {
      let tag = document.createElement('script');
      tag.setAttribute('src', script);
      document.head.appendChild(tag);
    },
  );
});
</script>

<template>
  <link
    href="https://cdn.jsdelivr.net/npm/heroicons-css@0.1.1/heroicons.min.css"
    rel="stylesheet"
  />

  <DefaultTheme.Layout />
</template>
