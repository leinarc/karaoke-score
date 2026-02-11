# [>>> TRY IT!!! <<<](https://leinarc.github.io/karaoke-score/)

# karaoke-score

Record a karaoke session and get a score, just like in parties! Although, I don't think this is how videoke machines actually work.

Anyway, it:

1. Computes DFT using [FFT](https://en.wikipedia.org/wiki/Fast_Fourier_transform),
2. Detects frequencies from the audio using [ACF2+](https://github.com/cwilso/PitchDetect) performed on the [ACF derived from FFT](http://www.publishingindia.com/GetBrochure.aspx?query=UERGQnJvY2h1cmVzfC80NTkucGRmfC80NTkucGRm) through the [Wiener–Khinchin theorem](https://en.wikipedia.org/wiki/Wiener%E2%80%93Khinchin_theorem),
3. Determines the key using a heuristic [Bayesian model](https://davidtemperley.com/wp-content/uploads/2015/12/temperley-ms04.pdf),
4. Computes scores based on how fitting each frequency is to the key,
5. Applies randomness by choosing one score (wherein higher scores have higher chances of being chosen), and
6. Picks one number between the chosen score and 100 (inclusive).

Thus, score computation at the end is random. However, singing to the key helps in securing more chances to score higher. Probably. That's the fun part of karaoke!
