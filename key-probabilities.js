// precalc prob for each note combi + key
// store best key for each combi
// on segment prediction, get best keys for each segment note combi
// for each segment best key, add all structure choices wherein:
// 1. the key does not change throughout
// 2. the key changes to the best key exactly on the current best key's segment
// 3. the key changes on any segment before the current best key's segment without changing again

const keyKeepProb = 0.998
const keyChangeProb = (1 - keyKeepProb)/23

const modeProfiles = [
	// Notes
	// [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1],
	// Krumhansl–Kessler profiles
	// [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], // Major
	// [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] // Minor
	// Kostka-Payne corpus
	[.748, .060, .488, .082, .670, .460, .096, .715, .104, .366, .057, .400], // Major
	[.712, .084, .474, .618, .049, .460, .105, .747, .404, .067, .133, .330] // Minor
]

const keyProfiles = []

for (var mode = 0; mode < modeProfiles.length; mode++) {
	const modeProfile = modeProfiles[mode]

	for (var tonic = 0; tonic < modeProfile.length; tonic++) {
		const half1 = modeProfile.slice(modeProfile.length - tonic)
		const half2 = modeProfile.slice(0, modeProfile.length - tonic)
		const keyProfile = [...half1, ...half2]

		keyProfiles.push(keyProfile)
	}
}



const modeNames = "Major Minor".split(' ')
const tonicNames = "C C# D D# E F F# G G# A A# B".split(' ')

const keyNames = []

for (var mode = 0; mode < modeNames.length; mode++) {
	const modeName = modeNames[mode]

	for (var tonic = 0; tonic < tonicNames.length; tonic++) {
		const tonicName = tonicNames[tonic]

		keyNames.push(tonicName + ' ' + modeName)
	}
}



const noteKeyProbs = new Array(24 * 2**12)
const noteBestKeys = new Array(2**12)

for (var i = 0; i < 2**12; i++) {
	var maxProb = 0
	for (var key = 0; key < 24; key++) {
		const keyProfile = keyProfiles[key]
		var prob = 1
		for (var note = 0; note < 12; note++) {
			if ((i>>note) % 2) {
				prob *= keyProfile[note]
			} else {
				prob *= 1 - keyProfile[note]
			}
		}
		noteKeyProbs[key * 2**12 + i] = prob
		if (prob > maxProb) {
			noteBestKeys[i] = [key]
			maxProb = prob
		} else if (prob == maxProb) {
			noteBestKeys[i].push(key)
		}
	}
}



function notesToIndex(notes) {
	return notes.reduce((a, b, i) => a + b * 2**i, 0)
}

function getStructureProb(lastKey, keys) {
	var prob = 1

	var key1 = lastKey

	for (var i = 0; i < keys.length; i++) {
		key2 = keys[i]

		if (key1 === undefined) {
			continue
		}

		if (key1 === key2) {
			prob *= keyKeepProb
			continue
		}

		prob *= keyChangeProb

		key1 = key2
	}

	return prob
}

function getSurfaceProb(keys, notesIndexes) {
	var prob = 1

	for(var i = 0; i < notesIndexes.length; i++) {
		const key = keys[i]
		const notesIndex = notesIndexes[i]
		prob *= noteKeyProbs[key * 2**12 + notesIndex]
	}

	return prob
}

function getStructureChoices(lastKey, notesIndexes) {
	const usedKeys = []
	const takenKeys = {}

	var keyStructures = []

	const newKeys = noteBestKeys[notesIndexes[0]]

	for (const newKey of newKeys) {
		keyStructures.push([newKey])
		usedKeys.push(newKey)
		takenKeys[newKey] = true
	}

	if (lastKey && !takenKeys[lastKey]) {
		keyStructures.push([lastKey])
		usedKeys.push(lastKey)
		takenKeys[lastKey] = true
	}

	for (var i = 1; i < notesIndexes.length; i++) {
		const notesIndex = notesIndexes[i]
		const newKeys = noteBestKeys[notesIndex].filter(bestKey => !takenKeys[bestKey])
		
		const newStructures = []

		for (const structure of keyStructures) {

			for (const usedKey of usedKeys) {
				newStructures.push([...structure, usedKey])
			}
			
			for (const newKey of newKeys) {
				for (var j = 0; j <= structure.length; j++) {
					const oldHalf = structure.slice(0,j)
					const newHalf = new Array(structure.length - j).fill(newKey)
					newStructures.push([...oldHalf, ...newHalf, newKey])
				}
				usedKeys.push(newKey)
				takenKeys[newKey] = true
			}
		}

		keyStructures = newStructures

	}

	return keyStructures

}