#!/bin/bash
d=$(date +%Y-%m-%d)
git add .
git commit -m $d
git push