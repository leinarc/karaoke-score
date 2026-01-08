const segmentInterval = 5000
const segmentLimit = 4

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

		const averageLoudness = data.reduce((a, b) => a + b[1], 0) / data.length
		displayLoudness(averageLoudness)

		const maxQuality = data.reduce((a, b) => {

			const freq = b[0]

			if (freq < minMelodyFreq || freq > maxMelodyFreq) return a

			const frac = (12 * Math.log2(freq / 440) % 1 + 1) % 1
			const quality = 1 - 4 * (1-frac) * frac

			return Math.max(a, quality)

		}, 0)
		displayQuality(maxQuality)

		for (const channel of data) {

			const [ freq ] = channel

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



var keyNoise = []

function analyseKey(data) {
		
	try {

		for (const channel of data) {

			let fullChroma = channel

			let log = ''
			// log += 'Full Chroma:\t'
			// log += fullChroma.map(
			// 	x => x.toFixed(3)
			// ).join('\t').split('\t').map(
			// 	(x, i) => (i > 0 && i % 12 == 0 ? '\n\t\t' : '') + x 
			// ).join('\t')
			// log += '\n'

			if (!lastMelodyData.length && !lastKeyData.length) {
				lastSegmentDate = Date.now()
			}

			const noiseThres = 0.8

			// Remove noise
			fullChroma = fullChroma.map((level, i) => level - (keyNoise[i] || 0))

			// Update noise filter
			keyNoise = fullChroma.map((level, i) => level * ((1-(level*noiseThres)**2)**0.5 || 0) / 1024 + (keyNoise[i] || 0))
			

			// Harmonic filter
			fullChroma = fullChroma.map(
				(x, i) => x - ((fullChroma[i-1] || 0) + (fullChroma[i+1] || 0)) / (fullChroma[i-1] && fullChroma[i+1] ? 2 : 1)
			)

			// const rawChroma = new Array(12).fill(0)
			// oldChroma.forEach((level, i) => {
			// 	rawChroma[i % 12] += level
			// })
			// log += 'Raw Chroma:\t'
			// log += rawChroma.map(x => x.toFixed(3)).join('\t')
			// log += '\n'

			// Put chroma into 12 bins
			let chroma = new Array(12).fill(0)
			fullChroma.forEach((level, i) => {
				chroma[i % 12] += level
			})

			// log += 'Filt Chroma:\t'
			// log += chroma.map(x => x.toFixed(3)).join('\t')
			// log += '\n'

			// Normalize
			{
				const norm = Math.hypot(...chroma) || 1
				chroma = chroma.map(x => x / norm)
			}

			// log += 'Norm Chroma:\t'
			// log += chroma.map(x => x.toFixed(3)).join('\t')
			// log += '\n'

			// Detect notes
			const notes = chroma.map(x => x > noiseThres ? 1 : 0)

			// log += 'Notes:  \t'
			// log += notes.map((x, i) => x ? noteNames[i] : '').join('\t')
			// log += '\n'
			
			notes.forEach((note, i) => {
				if (note) lastKeyData[i] = 1
			})

			// console.log(log)

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

			console.log('Notes:\t', nextKeyData.map((x, i) => x ? noteNames[i] : '').join('\t'))

			const key = getKey(lastSegmentKey, nextKeyData)
			console.log('Detected key:', keyNames[key])

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
	
	if (nextMelodyData.length && nextKeyData.length) {

		let keyData = nextKeyData
		while (keyData) {
			console.log('Notes:\t', keyData.map((x, i) => x ? noteNames[i] : '').join('\t'))
			keyData = keyData.next
		}

		const keys = getKeys(lastSegmentKey, nextKeyData)
		console.log('Detected keys:', keys.map(key => keyNames[key]).join('\t'))

		let melodyData = nextMelodyData

		for (const key of keys) {
			const newScores = getScores(key, melodyData)
			scores.push(...newScores)
			melodyData = melodyData.next
		}

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