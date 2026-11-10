# !/usr/bin/env sh

set -e

if [ -f "./config.sh" ]; then
    . ./config.sh
    echo 'Using config.sh'
else
    . ./config.sh.dist
    echo 'Using config.sh.dist'
fi

if [ "$1" = 'prod' ] && [ "$2" != 'true' ]; then
    echo -n "Are you sure to going production without sourcing blog repo? It will source from existing blog/ (y/n)? "
    read answer
    if [ "$answer" != "${answer#[Nn]}" ]; then
        echo 'Ok no worries...'
        exit 0
    fi
fi

if [ "$2" = 'true' ]; then
    if [ -d "blog" ]; then
        cd blog
        if [ "$(git config --get remote.origin.url)" != "$GIT_BLOG" ]; then
            echo "Blog repo changed!"
            rm -rf -- "$(pwd -P)" && cd ..
            git clone $GIT_BLOG
        else
            git reset --hard
            git pull
            cd -
        fi
    else
        git clone $GIT_BLOG
    fi
else
    echo 'Skipping blog sourcing...'
fi

if [ "$2" = 'dir' ] && [ $# -eq 3 ]; then
    echo "Sourcing blog from directory $3"
    rm -rf blog/
    cp -a "$3" blog/
fi

if [ ! -d "blog" ]; then
    echo 'No blog/ directory'
    exit 1
fi

if [ ! -d "blog/public" ]; then
    if [ -d "blog/.vuepress/public" ]; then
        echo 'Using existing blog/.vuepress/public/'
    else
        echo 'Missing blog/public/ directory'
        exit 1
    fi
else
    echo 'Move blog/public/ to blog/.vuepress/'
    rm -rf blog/.vuepress/public/
    mv -f blog/public/ blog/.vuepress/public/
fi

echo 'Yarn tiempos'

yarn

if [ "$1" = 'dev' ]; then
    if [ "$2" = 'dir' ] && [ $# -eq 3 ]; then
        echo "Watching $3 for changes"
        node watch.js "$3" &
        WATCH_PID=$!
        trap 'kill $WATCH_PID 2>/dev/null' EXIT INT TERM
    fi
    echo 'yarn: Dev VuePress'
    yarn dev
fi

if [ "$1" = 'prod' ]; then
    echo 'yarn: Build VuePress'
    NODE_OPTIONS=--openssl-legacy-provider yarn build

    cd blog/.vuepress/dist

    if [ -z "$CNAME" ]; then
        echo 'CNAME: None'
    else
        echo 'CNAME: created at blog/.vuepress/dist'
        echo $CNAME >CNAME
    fi

    git init
    git add -A
    git commit -m 'deploy'
    git branch -M main
    git push -f $GIT_HOSTING main

    cd -
fi
