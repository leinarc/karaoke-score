#!/bin/sh

mkdir -p ./gifs

for input in ./original-gifs/*.gif; do

    filename=$(basename "$input")

    output="./gifs/$filename"

    ffmpeg \
		-y \
		-i "$input" \
		-filter_complex "[0,v] fps=15,scale='min(128,iw)':'min(72,ih)':force_original_aspect_ratio=decrease:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=32[p];[s1][p]paletteuse=dither=bayer" \
		"$output"

done