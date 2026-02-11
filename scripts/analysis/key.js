import { notesToIndex, getStructureProb, getSurfaceProb } from './key-probabilities.js';

export function getFrequencyPitchClass(freq) {

	let pitchClass = 69 + 12 * Math.log2(freq / 440)

	if (pitchClass < 0) pitchClass = 0;

	const class1 = Math.floor(pitchClass)
	const class2 = class1 + 1

	const frac = pitchClass - class1
	const multiplier1 = frac < 0.5 ? 0.5 + Math.cos(frac*2 * Math.PI) / 2 : 0
	const multiplier2 = frac > 0.5 ? 0.5 + Math.cos(frac*2 * Math.PI) / 2 : 0

	return {
		class1,
		class2,
		multiplier1,
		multiplier2
	}
}

export function getFullChroma(fft, fftSize, sampleRate, startNote, noteCount) {

	const lastNote = startNote + noteCount - 1

	let fullChroma = []
	const maxValues = []

	for (let i = 0; i < noteCount; i++) {
		const note = startNote + i
		fullChroma[note] = 0
	}

	// Bins to notes/pitch class
	for (let i = 1; i < fft.length; i++) {

		let value = fft[i]

		const freq = sampleRate / fftSize *  i / 2

		const {
			class1,
			class2,
			multiplier1,
			multiplier2
		} = getFrequencyPitchClass(freq)

		if (class1 >= startNote && class1 <= lastNote) {
			fullChroma[class1] = (fullChroma[class1]||0) + value * multiplier1
			maxValues[class1] = (maxValues[class1]||0) + multiplier1
		}

		if (class2 >= startNote && class2 <= lastNote) {
			fullChroma[class2] = (fullChroma[class2]||0) + value * multiplier2
			maxValues[class2] = (maxValues[class2]||0) + multiplier2
		}

	}

	fullChroma = fullChroma.map((value, i) => value / maxValues[i])
	
	return fullChroma

}

export function getChroma(fullChroma) {

	// Dissonance Filter
	fullChroma = fullChroma.map(
		(x, i) => {
			if (x < 0) return x

			const a = fullChroma[i-1]
			const b = fullChroma[i+1]
			return (
				x
				+ (a>0 && x>a ? x-a : 0)
				+ (b>0 && x>b ? x-b : 0)
			) / 3
		}
	)

	// Put chroma levels into 12 bins
	let chroma = []
	fullChroma.forEach((x, i) => {
		chroma[i%12] = (chroma[i%12] || 0) + x
	})

	return chroma

}

export function getAverageChroma(fullChromas) {

	const averageChroma = []

	for (const fullChroma of fullChromas) {
		for (let i = 0; i < fullChroma.length; i++) {
			const a = averageChroma[i]
			const b = fullChroma[i]
			averageChroma[i] = a === undefined && b === undefined ? undefined : (a || 0) + (b || 0)
		}
	}

	averageChroma.map(x => x / fullChromas.length)

	return averageChroma

}

export function getMaxChroma(fullChromas) {

	const maxChroma = []

	for (const fullChroma of fullChromas) {
		for (let i = 0; i < fullChroma.length; i++) {
			const a = maxChroma[i]
			const b = fullChroma[i]
			maxChroma[i] = isNaN(a) ? b : b > a ? b : a
		}
	}

	return maxChroma

}

export function getKeys(lastKey, nextKeyData) {

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

export function getKey(...args) {
	const key = getKeys(...args)[0]

	return key
}





function formatFullChroma(fullChroma) {
	return fullChroma.map(
		x => x.toFixed(3)
	).join('\t').split('\t').map(
		(x, i) => (i > 0 && i % 12 == 0 ? '\n\t\t' : '') + x 
	).join('\t')
}

function formatChroma(chroma) {
	return chroma.map(x => x.toFixed(3)).join('\t')
}

function formatFullChromaInt(fullChroma) {
	return fullChroma.map(
		x => Math.floor(x)
	).join('\t').split('\t').map(
		(x, i) => (i > 0 && i % 12 == 0 ? '\n\t\t' : '') + x 
	).join('\t')
}

function formatChromaInt(chroma) {
	return chroma.map(x => Math.floor(x)).join('\t')
}