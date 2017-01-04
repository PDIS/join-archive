#!/bin/bash
d=$(date +%Y-%m-%dT%H:%M:%S)
git add .
git commit -m $d
git push