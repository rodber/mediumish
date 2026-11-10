# Mediumish

> _The Rodo Fork_ of `wowthemesnet/mediumish-vuepress-blog-theme` with super powers.

It takes a markdown blog repo and generates a VuePress app that can be configured to be automatically published to GitHub pages.

[View Demo](https://rodolfoberrios.com/)

## Requirements

- A markdown blog repository following a simply scheme (example [rodolfoberrios/blog](https://github.com/rodolfoberrios/blog/)).

### Tree for blog repo

```shell
./
├── .github
│   └── workflows
│       └── push-deploy.yml
├── _posts
│   └── 2020-07-09-a-post.md
├── public
│   ├── avatars
│   │   └── user.jpg
│   ├── icons
│   │   ├── android-chrome-192x192.png
│   │   └── android-chrome-512x512.png
│   ├── logo.png
│   ├── manifest.json
│   └── photos
│       └── some-photo.jpg
└── .vuepress
    ├── config.js
    ├── enhanceApp.js
    └── styles
        ├── index.styl
        └── palette.styl
```

### `.github/` folder

Read [Deploying to GitHub pages](#deploying-to-github-pages).

### `_posts/` folder

Contains the posts of the target blog source.

- ⚠ Post name must be in the format `YYYY-MM-DD-<name_here>.md`
- ⚠ Post must link internal resources using absolute path (Use `/` to map to [`public/` folder](#public-folder))

Posts use [Front Matter](https://jekyllrb.com/docs/front-matter/) to provide meta:

```md
---
date: 2020-07-09 11:32:02 GMT
title: Vuelvo a bloguear
tags:
    - ✊🏾resurrecting
author: Rodolfo
summary: Vuelvo a renacer, amado pueblo... Se siente tan vacío sin mi!
image: /photos/image.jpg
feed:
  description: Description used in feed
  image: /photos/image-alt.jpg
---
```

### `public/` folder

Public folder for logos, icons and manifest files that maps to the root. For example, `public/logo.png` will be available at `/logo.png` in the deployed app.

### `.vuepress/` folder

Contains `config.js`, `enhanceApp.js` and `styles/` used by VuePress. These allow to configure your blog name, links, authors and allow to define the colors used by the theme.

## Deploying to GitHub pages

Requirements:

- A GitHub repository for hosting (see [GitHub pages](https://pages.github.com/)).

### Require Secrets (on deploy repo)

> 🧔🏾 Your own clone of this repo is the deploy repo of yours.

- `REPO_BLOG` example [`rodolfoberrios/blog`](https://github.com/rodolfoberrios/blog/)
- `REPO_BLOG_ACCESS_TOKEN` token for the repo above
- `REPO_HOSTING` example `rodolfoberrios/rodolfoberrios.github.io`
- `REPO_HOSTING_ACCESS_TOKEN` token for the repo above
- `CNAME` example `rodolfoberrios.com`

### Require Secrets (on blog repo)

> 🧔🏾 Your own repo with your markdown files is the blog repo of yours.

- `REPO_BLOG_DEPLOY` the repo used for deploy example `rodolfoberrios/mediumish`
- `REPO_BLOG_DEPLOY_USERNAME` username with access to blog deploy repo
- `REPO_BLOG_DEPLOY_TOKEN` PAT for the username above

> ⚠ The personal access token must grant access to `repo` scope.

Configure the blog repo to **automatically trigger** a new deploy by adding `.github/workflows/push-deploy.yml` in the blog repo.

```yml
name: Push deploy
on: push
jobs:
  push-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Push it
        run: |
          curl -XPOST -u "${{ secrets.REPO_BLOG_DEPLOY_USERNAME }}:${{ secrets.REPO_BLOG_DEPLOY_TOKEN }}" -H "Accept: application/vnd.github.everest-preview+json" -H "Content-Type: application/json" https://api.github.com/repos/${{ secrets.REPO_BLOG_DEPLOY }}/dispatches --data '{"event_type": "build_application"}'
```

## Deploying with shell

- Requires [yarn](https://yarnpkg.com/).

Install all the dependencies.

```sh
yarn
```

Copy `config.sh.dist` to `config.sh`.

```sh
cp config.sh.dist config.sh
```

Change the variables in `config.sh` to match the target project. In this file you will configure the repositories for blog sourcing and hosting.

### Shell commands

Make sure that `deploy.sh` is executable.

```sh
chmod +x deploy.sh
```

Command syntax:

```sh
./deploy.sh <to> <doSource>
```

`<to>` deploy options:

| Option | Effect                |
| ------ | --------------------- |
| `dev`  | Deploys dev preview   |
| `prod` | Deploys to production |

`<doSource>` option:

| Option  | Effect                                          |
| ------- | ----------------------------------------------- |
| `true`  | Source `blog/` from the target blog repo        |
| `false` | Skip the blog sourcing (will use local `blog/`) |
| `dir`   | Use target dir as `blog/` source (copied)       |

With `dev`, the `dir` option also watches the target dir and syncs changes into `blog/`, so the dev server re-renders live:

```sh
./deploy.sh dev dir ~/git/chevereto/blog
```

## Known bugs

- Posts markdown files, (`YYYY-MM-DD-<name_here>.md`) must not start with a digit at `name_here`.
