#!/bin/bash
export PATH=$PATH:/usr/local/git/bin
export PATH=$PATH:/home/markdai/phantomjs/bin
rm -rf archive
phantomjs Crawler.js
d=$(date +%Y-%m-%dT%H:%M:%S)
git add .
git commit -m $d
git push
