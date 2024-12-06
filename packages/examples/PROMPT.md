Use the following technologies:

- Vue, without '.vue' files
- UnoCSS for styling. Do not use any custom classes.
- Embed the template in the createApp callback instead of including it in the
  HTML
- Add expressive animations using vueuse/motion

Use the below template:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <script lang="text/js" defer>
      window.__unocss = {
        theme: { colors: { kossabos: { green: '#6aaa64', yellow: '#c9b458' } } }
      }
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@unocss/runtime"></script>

    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@unocss/reset/tailwind.min.css"
    />
  </head>
  <body>
    <div id="app"></div>

    <script type="module" defer>
      import {
        MotionPlugin,
        useMotion,
      } from 'https://cdn.jsdelivr.net/npm/@vueuse/motion@2.2.6/+esm';

      const { ref, computed, createApp } = Vue;

      const app = createApp({
        setup() {
          return {};
        },
        template: `
        <div class="flex items-center justify-center min-h-screen bg-gray-100">
        </div>
      `,
      });

      app.use(MotionPlugin);
      app.mount('#app');
    </script>
  </body>
</html>
<!DOCTYPE html>
<html lang="en">
  <head>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <script lang="text/js" defer>
      window.__unocss = {
        theme: { colors: { kossabos: { green: '#6aaa64', yellow: '#c9b458' } } }
      }
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@unocss/runtime"></script>

    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@unocss/reset/tailwind.min.css"
    />
  </head>
  <body>
    <div id="app"></div>

    <script type="module" defer>
      import {
        MotionPlugin,
        useMotion,
      } from 'https://cdn.jsdelivr.net/npm/@vueuse/motion@2.2.6/+esm';

      const { ref, computed, createApp } = Vue;

      const app = createApp({
        setup() {
          return {};
        },
        template: `
        <div class="flex items-center justify-center min-h-screen bg-gray-100">
        </div>
      `,
      });

      app.use(MotionPlugin);
      app.mount('#app');
    </script>
  </body>
</html>
```
