#!/bin/bash
cd /home/markdai/join-archive

export PATH=$PATH:/usr/local/git/bin
export PATH=$PATH:/home/markdai/phantomjs/bin
git pull
rm -rf archive
phantomjs Crawler.js
d=$(date +%Y-%m-%dT%H:%M:%S)
git add .
git commit -m $d
git pull
git push
