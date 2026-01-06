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



function analyseMelody() {

	if (!analyzing) {
		return
	}
	
	try {

		tdAnalyser.getFloatTimeDomainData(tdBuffer)

		if (!lastMelodyData.length || !lastKeyData.length) {
			lastSegmentDate = Date.now()
		}

		lastMelodyData.push(getMelodyFreq(tdBuffer))

		analyseAudio()

	} catch (err) {

		console.error(err)
		alert('Failed to analyze audio melody.')
		clearAudio()

	}

}



function analyseKey() {

	if (!analyzing) {
		return
	}
	
	try {

		fftAnalyser.getFloatFrequencyData(fftBuffer)

		const notes = getKeyNotes(fftBuffer)
		notes.forEach((note, i) => {
			if (note) lastKeyData[i] = 1
		})

		if (!lastMelodyData.length || !lastKeyData.length) {
			lastSegmentDate = Date.now()
		}

		analyseAudio()

	} catch (err) {

		console.error(err)
		alert('Failed to analyze audio key.')
		clearAudio()

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



async function finish() {

	if (!analyzing) {
		return
	}

	await clearAudio()

	try {

		if (nextMelodyData.length && nextKeyData.length) {

			const keys = getKeys(lastSegmentKey, nextKeyData)
			console.log('Detected keys:', keys.map(key => keyNames[key]).join('\t'))

			var melodyData = nextMelodyData

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

		var score

		if (calculationName == "Weighted Probability Selection") {

			// Choose a random score wherein higher scores have higher chances of being chosen
			const totalScore = scores.reduce((a, b) => a + b, 0)
			var chosen = Math.random() * totalScore
			var i = 0

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



		startEndAnimation(score)
	
	} catch (err) {

		console.error(err)
		alert('Failed to analyze audio at the end.')

	}

	resetVariables()

}
