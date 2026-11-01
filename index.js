const removeMd = require('remove-markdown')
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
    ['seo', themeConfig.seo || {}],
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
     * Serve feeds in dev, generated on demand (they're only built on `generated`).
     */
    beforeDevServer(app) {
      if (!isFeedEnabled) {
        return
      }
      app.get(['/rss.xml', '/feed.atom', '/feed.json'], async (req, res) => {
        const feedHooks = ctx.pluginAPI
          .getOption('generated')
          .items.filter(({ name }) => name === 'vuepress-plugin-feed')
        await Promise.all(feedHooks.map(({ value }) => value()))
        res.sendFile(path.join(ctx.outDir, req.path))
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
          ) + ' ...'
        pageCtx.frontmatter.description = pageCtx.summary
      }
      if (pageCtx.frontmatter.summary) {
        pageCtx.frontmatter.description = pageCtx.frontmatter.summary
      }
    },
  }

  return config
}
