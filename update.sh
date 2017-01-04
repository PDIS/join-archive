#!/bin/bash
phantomjs Crawler_Completed.js
d=$(date +%Y-%m-%dT%H:%M:%S)
git add .
git commit -m $d
git push