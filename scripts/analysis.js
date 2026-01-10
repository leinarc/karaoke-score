const segmentInterval = 5000
const segmentLimit = 3

const melodyDataLimit = 1024

var segmentCount

var nextKeyData
var lastKeyData
var nextMelodyData
var lastMelodyData
var scores

var lastSegmentKey
var lastSegmentDate

const noteNames = "C C# D D# E F F# G G# A A# B".split(' ')

resetVariables()

function resetVariables() {
	segmentCount = 0

	nextKeyData = []
	lastKeyData = nextKeyData
	nextMelodyData = []
	lastMelodyData = nextMelodyData
	scores = []

	lastSegmentKey = undefined
}

function addSegment() {
	const newMelodyData = []
	lastMelodyData.next = newMelodyData
	lastMelodyData = newMelodyData
	const newKeyData = []
	lastKeyData.next = newKeyData
	lastKeyData = newKeyData
}

function removeSegment() {
	const oldKeyData = nextKeyData
	const oldMelodyData = nextMelodyData

	nextKeyData = oldKeyData.next
	nextMelodyData = oldMelodyData.next

	// Praying for garbage collection
	oldKeyData.next = undefined
	oldMelodyData.next = undefined
}



const minMelodyFreq = 50
const maxMelodyFreq = 2000

function analyseMelody(data) {

	try {

		flatData = data.flat()

		const averageLoudness = flatData.reduce((a, b) => a + b[1], 0) / data.length
		displayLoudness(averageLoudness)

		const maxQuality = flatData.reduce((a, b) => {

			const [ freq, peak ] = b

			if (freq < minMelodyFreq || freq > maxMelodyFreq) return a

			const frac = (12 * Math.log2(freq / 440) % 1 + 1) % 1
			const quality = 1 - 4 * (1-frac) * frac

			return Math.max(a, quality)

		}, 0)
		displayQuality(maxQuality)

		for (const frame of flatData) {

			const [ freq, peak ] = frame

			if (freq < minMelodyFreq || freq > maxMelodyFreq) continue

			if (!lastMelodyData.length && !lastKeyData.length) {
				lastSegmentDate = Date.now()
			}

			lastMelodyData.push(freq)
				
		}

		analyseAudio()

	} catch (err) {

		console.error(err)
		alert('Failed to analyze audio melody.')
		disconnectAnalyser()

	}

}



var keyNoiseFilters
const keyMaxErrorAccumulation = 1
const keyMinErrorAccumulation = -1
var pMult
var iMult
var dMult

resetKeyNoise()

function resetKeyNoise() {
	keyNoiseFilters = []
	pMult = 1
	iMult = 0.001
	dMult = 0
}

function analyseKey(data) {
		
	try {

		if (pMult > 0.01) pMult *= 0.95
		if (iMult > 0.00001) iMult *= 0.95

		for (let k = 0; k < data.length; k++) {

			const channel = data[k]

			let channelFilters = keyNoiseFilters[k]
			if (!channelFilters) {
				channelFilters = []
				keyNoiseFilters[k] = channelFilters
			}

			for (let j = 0; j < channel.length; j++) {

				if (!lastMelodyData.length && !lastKeyData.length) {
					lastSegmentDate = Date.now()
				}

				// let log = ''

				const frame = channel[j]
				let [ fullChroma, peak ] = frame

				let channelFilter = channelFilters[j]
				if (!channelFilter) {
					channelFilter = {noiseFilter: [], errorAccumulation: [], lastNoiseFilter: []}
					channelFilters[j] = channelFilter
				}

				// log += 'peak:\t'
				// log += peak
				// log += '\n'

				// log += 'Full Chroma:\t'
				// log += formatFullChroma(fullChroma)
				// log += '\n'
				
				// log += 'True Chroma:\t'
				// log += formatFullChromaInt(fullChroma.map(x => x * peak))
				// log += '\n'



				// Calculate PIDs for the filter
				let { noiseFilter, errorAccumulation, lastNoiseFilter } = channelFilter

				const E = fullChroma
					.map((level, i) => level*peak*1.2 - (noiseFilter[i]||0))
					.map(error => error > 0 ? error/64 : error)

				const P = E

				const I = errorAccumulation.slice()

				E.forEach((e, i) => {
					I[i] = Math.max(Math.min((I[i]||0) + e, keyMaxErrorAccumulation), keyMinErrorAccumulation)
				})

				const D = noiseFilter.map((e, i) => e - (lastNoiseFilter[i]||0))

				// Update noise filter
				lastNoiseFilter = noiseFilter
				noiseFilter = []
				I.forEach((I_i, i) => {
					const change = (lastNoiseFilter[i]||0) + pMult*(P[i]||0) + iMult*I_i + dMult*(D[i]||0)
					noiseFilter[i] = change 
				})

				channelFilter.noiseFilter = noiseFilter
				channelFilter.errorAccumulation = I
				channelFilter.lastNoiseFilter = lastNoiseFilter

				// log += 'Noise Filter:\t'
				// log += formatFullChroma(noiseFilter.map(x => (x / peak)))
				// log += '\n'
				
				// log += 'True Filter:\t'
				// log += formatFullChromaInt(noiseFilter)
				// log += '\n'



				// Apply noise filter
				fullChroma = fullChroma.map((level, i) => (level - noiseFilter[i]/peak) / ((1-noiseFilter[i]/peak) || 1))

				displayVisualizer(fullChroma)

				// log += 'Filt Chroma:\t'
				// log += formatFullChroma(fullChroma)
				// log += '\n'

				// log += 'Filt Chroma:\t'
				// log += formatFullChromaInt(fullChroma.map(x => x * peak))
				// log += '\n'

				

				// Dissonance filter
				fullChroma = fullChroma.map(
					(x, i) => {
						if (x < 0) return 0

						a = fullChroma[i-1]
						b = fullChroma[i+1]
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
					chroma[i % 12] = (chroma[i % 12] || 0) + x
				})

				// log += 'Harm Chroma:  \t'
				// log += formatChroma(chroma)
				// log += '\n'



				// Normalize
				// {
				// 	const norm = Math.hypot(...chroma) || 1
				// 	chroma = chroma.map(x => x / (norm + 0.5) * 1.5)
				// }

				// log += 'Norm Chroma:\t'
				// log += formatChroma(chroma)
				// log += '\n'



				// Detect notes
				const notes = chroma.map(x => x > 0.8 ? 1 : 0)

				// log += 'Notes:  \t'
				// log += notes.map((x, i) => x ? noteNames[i] : '').join('\t')
				// log += '\n'
				
				notes.forEach((note, i) => {
					if (note) lastKeyData[i] = 1
				})

				// console.log(log)

				// if (notes.some(x => x)) {
				// 	console.log('Notes:  \t' + notes.map((x, i) => x ? noteNames[i] : '').join('\t'))
				// }



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

			}

		}

		analyseAudio()

	} catch (err) {

		console.error(err)
		alert('Failed to analyze audio key.')
		disconnectAnalyser()

	}
	
}



function analyseAudio() {

	const melodyDataOverflow = lastMelodyData.length > melodyDataLimit
	const expiredSegment = Date.now() >= lastSegmentDate + segmentInterval

	if (
		(lastMelodyData.length || expiredSegment) &&
		(lastKeyData.length || melodyDataOverflow) &&
		expiredSegment
	) {
		if (segmentCount >= segmentLimit) {

			console.log('Key Notes:\t' + nextKeyData.map((x, i) => x > 0 ? noteNames[i] : '').join('\t'))

			const key = getKey(lastSegmentKey, nextKeyData)
			console.log('Detected key:\t' + keyNames[key])

			displayKey(key)

			const newScores = getScores(key, nextMelodyData)
			scores.push(...newScores)

			lastSegmentKey = key

			removeSegment()

		} else {

			segmentCount++

		}

		addSegment()
	}

}



function getFinalScore() {

	let keyData = nextKeyData
	while (keyData) {
		console.log('Key Notes:\t' + keyData.map((x, i) => x > 0 ? noteNames[i] : '').join('\t'))
		keyData = keyData.next
	}

	const keys = getKeys(lastSegmentKey, nextKeyData)
	console.log('Detected keys:\t' + keys.map(key => keyNames[key]).join('\t'))

	let melodyData = nextMelodyData

	for (const key of keys) {
		const newScores = getScores(key, melodyData)
		scores.push(...newScores)
		melodyData = melodyData.next
	}

	// Add zero if scores array is empty
	if (!scores.length) {
		scores = [0]
	}

	console.log('='.repeat(20))
	console.log('SCORE DATA')
	console.log('='.repeat(20))
	console.log(scores)
	console.log('Max:', Math.max(...scores) * 100)
	console.log('Average:', scores.reduce((a, b) => a + b, 0)/scores.length * 100) 
	console.log('Root Mean Square:', (scores.reduce((a, b) => a + b*b, 0)/scores.length)**0.5 * 100)



	const calculationName = calculationNames[calculation]

	let score

	if (calculationName == "Weighted Probability Selection") {

		// Choose a random score wherein higher scores have higher chances of being chosen
		const totalScore = scores.reduce((a, b) => a + b, 0)
		let chosen = Math.random() * totalScore
		let i = 0

		scores.sort((a, b) => b[0] - a[0])

		while (chosen >= 0 && i < scores.length) {
			chosen -= scores[i]
			score = scores[i]
			i++
		}

	} else if (calculationName == "Equal Probability Selection") {

		// Choose a random score
		score = scores[Math.floor(Math.random() * scores.length)]

	} else if (calculationName == "Root Mean Square") {

		// Compute RMS
		score = (scores.reduce((a, b) => a + b*b, 0)/scores.length)**0.5

	} else {

		// Compute average
		score = scores.reduce((a, b) => a + b, 0)/scores.length

	}

	console.log('Calculated Score:', score * 100)



	const randomizationName = randomizationNames[randomization]
	if (randomizationName == "Calculated score to 100") {

		// Randomize between calculated score and 1
		score = Math.random() * (1 - score) + score

	} else if (randomizationName == "0 to calculated score") {

		// Randomize between 0 and calculated score
		score = Math.random() * score
		
	}

	console.log('Randomized Score:', score * 100)



	// Round to 0-100
	score = Math.min(100, Math.max(0, Math.floor(score * 101)))

	console.log('Final Score:', score)

	return score

}

onScriptLoad()