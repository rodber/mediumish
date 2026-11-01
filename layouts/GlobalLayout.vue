<template>
  <div id="vuepress-theme-blog__global-layout">
    <Header
      :is-open="isMobileHeaderOpen"
      @toggle-sidebar="isMobileHeaderOpen = !isMobileHeaderOpen"
    />
    <div class="container wrapmain" @click="isMobileHeaderOpen = false">
      <DefaultGlobalLayout />
    </div>
    <Footer />
  </div>
</template>

<script>
import GlobalLayout from '@app/components/GlobalLayout.vue'
import Header from '@theme/components/Header.vue'
import Footer from '@theme/components/Footer.vue'

export default {
  components: {
    DefaultGlobalLayout: GlobalLayout,
    Header,
    Footer,
  },

  data() {
    return {
      isMobileHeaderOpen: false,
    }
  },

  /**
   * Canonical and JSON-LD head tags, rendered by templates/ssr.html.
   */
  created() {
    if (this.$ssrContext) {
      this.$ssrContext.seoHead = this.seoHead()
    }
  },

  mounted() {
    this.$router.afterEach(() => {
      this.isMobileHeaderOpen = false
    })
  },

  methods: {
    seoHead() {
      const domain = (this.$themeConfig.domain || '').replace(/\/$/, '')
      if (!domain || this.$page.path === '/404.html') {
        return ''
      }
      const url = domain + this.$page.path
      const absolute = (path) =>
        path && !/^https?:\/\//.test(path) ? domain + path : path
      const escapeAttr = (value) =>
        value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      const tags = [`<link rel="canonical" href="${escapeAttr(url)}">`]

      let jsonLd
      const frontmatter = this.$frontmatter
      if (frontmatter.layout === 'Post') {
        const author = (this.$themeConfig.authors || []).find(
          ({ name }) => name === frontmatter.author
        )
        jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: this.$page.title,
          description: frontmatter.description,
          url,
          mainEntityOfPage: url,
          image: absolute(frontmatter.image),
          datePublished:
            frontmatter.date && new Date(frontmatter.date).toISOString(),
          dateModified: this.$page.lastUpdated,
          keywords: [].concat(frontmatter.tags || []).join(', ') || undefined,
          author: {
            '@type': 'Person',
            name: author ? author.name : this.$site.title,
            url: author ? author.link : domain + '/',
          },
        }
      } else if (this.$page.path === '/') {
        jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: this.$site.title,
          description: this.$site.description,
          url: domain + '/',
        }
      }
      if (jsonLd) {
        const json = JSON.stringify(jsonLd).replace(/</g, '\\u003c')
        // Split closing tag, a literal one would end this SFC <script> block
        tags.push(`<script type="application/ld+json">${json}</` + 'script>')
      }

      return tags.join('\n    ')
    },
  },
}
</script>

<style lang="stylus">
body {
  min-width: 320px;
}

#vuepress-theme-blog__global-layout {
  word-wrap: break-word;
}

.content-wrapper {
  padding: 160px 15px 80px 15px;
  min-height: calc(100vh - 80px - 60px - 160px);
  max-width: $contentWidth;
  margin: 0 auto;

  @media (max-width: $MQMobile) {
    & {
      padding: 100px 15px 20px 15px;
      min-height: calc(100vh - 20px - 60px - 100px);
    }
  }
}
</style>
