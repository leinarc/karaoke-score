# [>>> TRY IT!!! <<<](https://leinarc.github.io/karaoke-score/)

# karaoke-score

Record a karaoke session and get a score, just like in parties! Although, I don't think this is how videoke machines actually work.

Anyway, it:

1. Records frequencies from the audio (using [ACF2+](https://whatnoteisthis.com/)),
2. Determines the key (using a heuristic [Bayesian model](https://davidtemperley.com/wp-content/uploads/2015/12/temperley-ms04.pdf)),
3. Computes scores based on how fitting each frequency is to the key,
4. Applies randomness by choosing one score (higher scores have higher chances of being chosen), and
5. Picks one number between the chosen score and 100 (inclusive).

Thus, score computation at the end is random. However, singing to the key helps in securing more chances to score higher. Probably. That's the fun part of karaoke!
