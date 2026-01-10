#!/bin/sh

mkdir -p ./processors

for input in ./processors/*.c; do

    base="${input%.*}"

    output="$base.wasm"

    clang -O3 --target=wasm32 --no-standard-libraries -Wl,--export-all -Wl,--no-entry -o "$output" "$input"

done