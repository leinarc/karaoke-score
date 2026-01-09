const onKeyNotes = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1]

function getScores(key, melodyData) {

	const profile = rotateProfile(onKeyNotes, key)

	const scores = []

	for (let i = 0; i < melodyData.length; i++) {
		const freq = melodyData[i]

		if (!(freq > 0)) continue

		let pitchClass = (9 + 12 * Math.log2(freq / 440)) % 12

		while (pitchClass < 0) {
			pitchClass += 12
		}

		const class1 = Math.floor(pitchClass);
		const class2 = (class1 + 1) % 12;

		const frac = pitchClass - class1

		const keyScore = profile[class1]*(1-frac) + profile[class2]*frac
		const noteScore = 1 - frac * (1-frac)

		scores.push(keyScore * noteScore)
	}

	return scores

}

onScriptLoad()