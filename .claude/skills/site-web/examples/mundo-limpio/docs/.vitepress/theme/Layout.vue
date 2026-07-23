<!-- Procedencia: plantilla skill site-web · Layout fanzine + pack marca
     Fecha: 2026-07-23 · mundo=nexo-atlas
     Home con piel real (stamp/washi/callout). Sin shell DefaultTheme.
     BRAND_* parametrizados (fixture inventada — sin assets de mundo real). -->
<script setup>
import DefaultTheme from 'vitepress/theme'
import { useData, withBase } from 'vitepress'
import { computed } from 'vue'

const { Layout: DefaultLayout } = DefaultTheme
const { frontmatter } = useData()

/** OPT-IN explícito (#18). Sin piel:fanzine → shell familia-vp. */
const isFanzineHome = computed(() => {
  const fm = frontmatter.value || {}
  return fm.piel === 'fanzine' || fm.layout === 'fanzine'
})

const bannerSrc = computed(() => {
  const b = frontmatter.value?.brandBanner
  return b ? withBase(b) : null
})
const licenciaHref = computed(() =>
  withBase(frontmatter.value?.brandLicense || '/licencia')
)
const footerText = computed(
  () => frontmatter.value?.footer || frontmatter.value?.brandFooter || 'nexo-atlas'
)
</script>

<template>
  <div v-if="isFanzineHome" class="zine-shell">
    <div v-if="bannerSrc" class="brand-banner" role="banner">
      <img
        :src="bannerSrc"
        :alt="footerText"
        class="brand-banner__img"
        width="1190"
        height="auto"
      />
    </div>
    <header class="header">
      <div class="stamp">{{ frontmatter.stamp || 'ZINE' }}</div>
      <h1>{{ frontmatter.title || 'Portal' }}</h1>
      <div v-if="frontmatter.sub" class="sub">{{ frontmatter.sub }}</div>
      <div v-if="frontmatter.sub2" class="sub2">{{ frontmatter.sub2 }}</div>
      <div v-if="frontmatter.issue" class="issue">{{ frontmatter.issue }}</div>
    </header>
    <div class="washi" aria-hidden="true"></div>
    <div v-if="frontmatter.callout" class="callout tilt-r">
      {{ frontmatter.callout }}
    </div>
    <main class="zine-main">
      <Content />
    </main>
    <footer class="footer brand-footer">
      <span class="brand-footer__mark">{{ footerText }}</span>
      <span aria-hidden="true"> · </span>
      <a class="brand-footer__license" :href="licenciaHref">Licencia</a>
    </footer>
  </div>
  <DefaultLayout v-else />
</template>
