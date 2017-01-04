#!/bin/bash
d=$(date +%Y-%m-%d:%H:%M:%S)
git add .
git commit -m $d
git push