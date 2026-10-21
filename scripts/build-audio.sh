#!/bin/sh
set -eu
mkdir -p media
for source in src/content/audio/*.txt; do
  name=$(basename "$source" .txt)
  say -v Luciana -r 145 -f "$source" -o "/tmp/btm-$name.aiff"
  ffmpeg -y -hide_banner -loglevel error -i "/tmp/btm-$name.aiff" -codec:a aac -b:a 64k "media/$name.m4a"
  rm "/tmp/btm-$name.aiff"
done
