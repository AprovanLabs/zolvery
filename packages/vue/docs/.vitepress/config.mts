import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Kossabos Vue",
  description: "Components and plugins!",
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
  }
})
