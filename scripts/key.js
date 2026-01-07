const minInstrFreq = 50
const maxInstrFreq = 3200

function getKeyChroma(buf) {

	// Convert from dB to linear
	const fftData = buf.map(db => Number.isFinite(db) ? 10**(db/20) : 0)

	const chroma = new Array(12).fill(0)

	const sampleRate = audioContext.sampleRate

	// Bins to notes/pitch class
	for (var i = 1; i < fftData.length; i++) {

		var value = fftData[i]

		const freq = i / (fftData.length - 1) * sampleRate / 2;

		// Limit to instrument range
		if (freq < minInstrFreq/2) continue
		if (freq > maxInstrFreq*2) break

		// Use linkwitz-riley filter to limit frequencies to instrument range
		value *= (freq / minInstrFreq)**4 / (1 + (freq / minInstrFreq)**4)
		value *= 1 / (1 + (freq / maxInstrFreq)**4)

		var pitchClass = (9 + 12 * Math.log2(freq / 440)) % 12

		while (pitchClass < 0) {
			pitchClass += 12
		}

		const class1 = Math.floor(pitchClass);
		const class2 = (class1 + 1) % 12;

		const frac = pitchClass - class1
		
		chroma[class1] += value * (1 - frac)**2
		chroma[class2] += value * frac**2

	}

	// console.log(chroma.map(x => x.toFixed(3)).join('\t'))

	return chroma

}

function getKeyNotes(buf) {

	var chroma = getKeyChroma(buf)

	// Normalize
	const norm = Math.hypot(...chroma)

	chroma = chroma.map(x => x / norm)

	const notes = chroma.map(x => x > 0.5 ? 1 : 0)

	console.log(chroma.map(x => x.toFixed(3)).join('\t'))
	console.log(notes.join('\t'))

	return notes
}

function getKeys(lastKey, nextKeyData) {

	const notesIndexes = []
	var keyData = nextKeyData
	while (keyData && keyData.length) {
		notesIndexes.push(notesToIndex(keyData))
		keyData = keyData.next
	}

	const keyStructures = getStructureChoices(lastKey, notesIndexes)

	const structureProbs = keyStructures.map(keys => [
		getStructureProb(lastKey, keys) * getSurfaceProb(keys, notesIndexes),
		keys
	])
	
	structureProbs.sort((a, b) => b[0] - a[0])

	const keys = structureProbs[0][1]

	return keys

}

function getKey(...args) {
	const key = getKeys(...args)[0]

	return key
}

onScriptLoad()