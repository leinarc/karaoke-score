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

for (let mode = 0; mode < modeProfiles.length; mode++) {
	const modeProfile = modeProfiles[mode]

	for (let tonic = 0; tonic < 12; tonic++) {
		const half1 = modeProfile.slice(12 - tonic)
		const half2 = modeProfile.slice(0, 12 - tonic)
		const keyProfile = [...half1, ...half2]

		keyProfiles.push(keyProfile)
	}
}



const modeNames = "Major Minor".split(' ')

const keyNames = []

for (let mode = 0; mode < modeNames.length; mode++) {
	const modeName = modeNames[mode]

	for (let tonic = 0; tonic < noteNames.length; tonic++) {
		const tonicName = noteNames[tonic]

		keyNames.push(tonicName + ' ' + modeName)
	}
}



const noteKeyProbs = new Array(24 * 2**12)
const noteBestKeys = new Array(2**12)

for (let i = 0; i < 2**12; i++) {
	let maxProb = -1
	for (let key = 0; key < 24; key++) {
		const keyProfile = keyProfiles[key]
		let prob = 1
		for (let note = 0; note < 12; note++) {
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



function rotateProfile(profile, key) {

	const offset = (Math.floor(key / 12) * 3 + key)  % 12
	const half1 = profile.slice(12 - offset)
	const half2 = profile.slice(0, 12 - offset)
	profile = half1.concat(half2)

	return profile
	
}

function notesToIndex(notes) {

	// Only take the 5 most frequent notes
	return notes
		.map((count, note) => [count, note])
		.sort((a, b) => a[0] - b[0])
		.filter(arr => arr[0] > 0)
		.slice(0, 5)
		.map(arr => notes[arr[1]])
		.reduce((a, b, i) => a + (b > 0 ? 1 : 0) * 2**i, 0)

}

function getStructureProb(lastKey, keys) {
	let prob = 1

	let key1 = lastKey

	for (let i = 0; i < keys.length; i++) {
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
	let prob = 1

	for(let i = 0; i < notesIndexes.length; i++) {
		const key = keys[i]
		const notesIndex = notesIndexes[i]
		prob *= noteKeyProbs[key * 2**12 + notesIndex]
	}

	return prob
}

function getStructureChoices(lastKey, notesIndexes) {

	const takenKeys = {}

	let keyStructures = []

	if (lastKey !== undefined) {
		keyStructures.push([lastKey])
		takenKeys[lastKey] = true
	}

	const newKeys = noteBestKeys[notesIndexes[0]].filter(bestKey => bestKey !== lastKey)

	for (const newKey of newKeys) {
		if (!takenKeys[newKey]) {
			keyStructures.push([newKey])
			takenKeys[newKey] = true
		}
	}

	for (let i = 1; i < notesIndexes.length; i++) {

		const takenKeys = {}
		
		const notesIndex = notesIndexes[i]
		const newKeys = noteBestKeys[notesIndex]
		
		const newStructures = []

		for (const structure of keyStructures) {

			const lastKey = structure[structure.length - 1]

			newStructures.push([...structure, lastKey])
			takenKeys[lastKey] = true
			
			for (const newKey of newKeys) {
				if (!takenKeys[newKey]) {
					for (let j = 0; j <= structure.length; j++) {
						const oldHalf = structure.slice(0,structure.length - j)
						const newHalf = new Array(j).fill(newKey)
						newStructures.push([...oldHalf, ...newHalf, newKey])
					}
					takenKeys[newKey] = true
				}
			}
		}

		keyStructures = newStructures

	}

	return keyStructures

}

onScriptLoad()