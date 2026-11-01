const removeMd = require('remove-markdown')
const fs = require('fs')
const path = require('path')
const pick = require('lodash/pick')
const uniqBy = require('lodash/uniqBy')

module.exports = (themeConfig, ctx) => {
  /**
   * Default theme configuration
   */
  themeConfig = Object.assign(themeConfig, {
    logo: themeConfig.logo || '/logo.png',
    nav: themeConfig.nav || [
      {
        text: 'Blog',
        link: '/',
      },
      {
        text: 'Tags',
        link: '/tag/',
      },
    ],
    summary: themeConfig.summary === undefined ? true : themeConfig.summary,
    summaryLength:
      typeof themeConfig.summaryLength === 'number'
        ? themeConfig.summaryLength
        : 200,
    pwa: !!themeConfig.pwa,
  })

  /**
   * Configure blog plugin
   */
  const defaultBlogPluginOptions = {
    directories: [
      {
        id: 'blog',
        dirname: '_posts',
        path: '/',
      },
    ],
    frontmatters: [
      {
        id: 'tag',
        keys: ['tags'],
        path: '/tag/',
      },
    ],
    globalPagination: {
      lengthPerPage: 6,
    },
  }

  let resolvedFeedOptions
  const isFeedEnabled = themeConfig.feed && themeConfig.feed.canonical_base
  if (isFeedEnabled) {
    const {
      rss = true,
      atom = true,
      json = true,
      sort = (entries) => entries,
      ...feedOptions
    } = themeConfig.feed
    resolvedFeedOptions = Object.assign({}, feedOptions, {
      // Dev reloads re-collect pages, keep only the latest copy of each one
      sort: (entries) =>
        sort(uniqBy(entries.slice().reverse(), 'path').reverse()),
      feeds: {
        rss2: { enable: rss },
        atom1: { enable: atom },
        json1: { enable: json },
      },
    })
  }

  const properties = [
    'directories',
    'frontmatters',
    'globalPagination',
    'sitemap',
    'comment',
    'newsletter',
  ]
  const themeConfigPluginOptions = {
    ...pick(themeConfig, properties),
    feed: resolvedFeedOptions,
  }

  const blogPluginOptions = Object.assign(
    {},
    defaultBlogPluginOptions,
    themeConfigPluginOptions
  )

  /**
   * SEO page data, must run after @vuepress/blog (and its @vuepress/last-updated)
   * and before seo, which reads layout, lastUpdated and description.
   */
  const seoPageData = {
    name: 'mediumish-seo-page-data',
    extendPageData($page) {
      const { frontmatter } = $page
      // Git dates change on every repo-wide commit, prefer the post dates
      if (
        frontmatter.layout === 'Post' &&
        (frontmatter.lastmod || frontmatter.date)
      ) {
        $page.lastUpdated = new Date(
          frontmatter.lastmod || frontmatter.date
        ).toISOString()
      }
      // Generated listing pages (tags, pagination) get a unique description
      if (
        !$page.relativePath &&
        !frontmatter.description &&
        $page.path !== '/'
      ) {
        const siteDescription = ctx.siteConfig.description || ''
        frontmatter.description = [
          $page.title || frontmatter.title,
          siteDescription,
        ]
          .filter(Boolean)
          .join(' | ')
      }
    },
  }

  const seoOptions = Object.assign(
    {
      type: ($page) =>
        $page.frontmatter.layout === 'Post' ? 'article' : 'website',
    },
    themeConfig.seo
  )

  /**
   * Integrate plugins
   */
  const plugins = [
    '@vuepress/plugin-nprogress',
    ['@vuepress/medium-zoom', true],
    [
      '@vuepress/search',
      {
        searchMaxSuggestions: 10,
      },
    ],
    ['@vuepress/blog', blogPluginOptions],
    seoPageData,
    ['seo', seoOptions],
  ]

  /**
   * Enable pwa
   */
  if (themeConfig.pwa) {
    plugins.push([
      '@vuepress/pwa',
      {
        serviceWorker: true,
        updatePopup: true,
      },
    ])
  }

  const config = {
    plugins,
    define: {
      THEME_BLOG_PAGINATION_COMPONENT: themeConfig.paginationComponent
        ? themeConfig.paginationComponent
        : 'Pagination',
    },
    alias: {
      fonts: path.resolve(__dirname, 'fonts'),
    },
    /**
     * Lazy load content images.
     */
    extendMarkdown(md) {
      const renderImage = md.renderer.rules.image
      md.renderer.rules.image = (tokens, idx, options, env, self) => {
        tokens[idx].attrSet('loading', 'lazy')
        return renderImage(tokens, idx, options, env, self)
      }
    },
    /**
     * Serve feeds and sitemap in dev, generated on demand (they're only built on `generated`).
     */
    beforeDevServer(app) {
      const routes = []
      if (isFeedEnabled) {
        routes.push([
          ['/rss.xml', '/feed.atom', '/feed.json'],
          'vuepress-plugin-feed',
        ])
      }
      if (themeConfig.sitemap && themeConfig.sitemap.hostname) {
        routes.push([['/sitemap.xml'], 'vuepress-plugin-sitemap'])
      }
      routes.forEach(([paths, pluginName]) => {
        app.get(paths, async (req, res) => {
          fs.mkdirSync(ctx.outDir, { recursive: true })
          const hooks = ctx.pluginAPI
            .getOption('generated')
            .items.filter(({ name }) => name === pluginName)
          await Promise.all(hooks.map(({ value }) => value()))
          res.sendFile(path.join(ctx.outDir, req.path))
        })
      })
    },
    /**
     * Generate summary.
     */
    extendPageData(pageCtx) {
      const strippedContent = pageCtx._strippedContent
      if (!strippedContent) {
        return
      }
      if (themeConfig.summary) {
        pageCtx.summary =
          removeMd(
            strippedContent
              .trim()
              .replace(/^#+\s+(.*)/, '')
              .slice(0, themeConfig.summaryLength)
          )
            .replace(/\s+/g, ' ')
            .trim() + ' ...'
        pageCtx.frontmatter.description = pageCtx.summary
      }
      if (pageCtx.frontmatter.summary) {
        pageCtx.frontmatter.description = pageCtx.frontmatter.summary
      }
    },
  }

  return config
}
