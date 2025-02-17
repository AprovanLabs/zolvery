import path from 'path';
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Kossabos Vue",
  description: "Components and plugins",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Components', link: '/components' },
      { text: 'Plugins', link: '/plugins' }
    ],

    sidebar: [],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/aprovanlabs/kossabos' }
    ]
  },
  vite: {
    resolve: {
      alias: {
        '@kossabos/vue': path.resolve(__dirname, '../../src'),
        '~lucide-static': path.resolve(
          __dirname,
          '../../node_modules/lucide-static',
        ),
      }
    }
  }
})
