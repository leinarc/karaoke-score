const minInstrFreq = 50
const maxInstrFreq = 3200

const keyMinPeak = 0.0001

var keyAllTimePeak = 0

function getKeyChroma(buf) {

	// Convert from dB to linear
	const fftData = buf.map(db => Number.isFinite(db) ? 10**(db/20) : 0)

	let fullChroma = []

	const sampleRate = audioContext.sampleRate

	// Bins to notes/pitch class
	for (let i = 1; i < fftData.length; i++) {

		let value = fftData[i]

		const freq = i / (fftData.length - 1) * sampleRate / 2;

		// Limit to instrument range
		if (freq < minInstrFreq/2) continue
		if (freq > maxInstrFreq*2) break

		// Use linkwitz-riley filter to limit frequencies to instrument range
		value *= (freq / minInstrFreq)**4 / (1 + (freq / minInstrFreq)**4)
		value *= 1 / (1 + (freq / maxInstrFreq)**4)

		let pitchClass = (9 + 12 * Math.log2(freq / 440))

		while (pitchClass < 0) {
			pitchClass += 12
		}

		const class1 = Math.floor(pitchClass);
		const class2 = (class1 + 1) % 12;

		const frac = pitchClass - class1
		const multiplier = (1 - Math.cos(frac * Math.PI))
		
		fullChroma[class1] += value * (1 - multiplier)
		fullChroma[class2] += value * multiplier

	}

	fullChroma = fullChroma.map((x, i) => x * sensitivities[i])

	const peak = fullChroma.reduce((a, b) => Math.max(a, b), 0)

	keyAllTimePeak = peak / 128 + keyAllTimePeak * 127 / 128;

	if (keyAllTimePeak < keyMinPeak) {
		keyAllTimePeak = keyMinPeak
	}

	if (keyAllTimePeak > peak) {
		peak = keyAllTimePeak;
	}

	if (peak > 0) {
		fullChroma = fullChroma.map(x => x / peak)
	}

	// console.log(fullChroma.map(x => x.toFixed(3)).join('\t'))

	return [fullChroma, peak]

}

function getKeys(lastKey, nextKeyData) {

	const notesIndexes = []
	let keyData = nextKeyData
	while (keyData) {
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