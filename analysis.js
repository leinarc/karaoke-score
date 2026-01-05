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
	
	try {

		tdAnalyser.getFloatTimeDomainData(tdBuffer)

		if (!lastMelodyData.length || !lastKeyData.length) {
			lastSegmentDate = Date.now()
		}

		lastMelodyData.push(getMelodyFreq(tdBuffer))

		analyseAudio()

	} catch (err) {

		console.error(err)
		alert('Failed to analyze audio.')
		clearAudio()

	}

}



function analyseKey() {
	
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
		alert('Failed to analyze audio.')
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

		// Choose a random score wherein higher scores have higher chances of being chosen
		const totalScore = scores.reduce((a, b) => a + b, 0)
		var chosen = Math.random() * totalScore
		var chosenScore = 0
		var i = 0

		scores.sort((a, b) => b[0] - a[0])

		while (chosen > 0 && i <= scores.length) {
			const score = scores[i]
			chosen -= score
			chosenScore = score
			i++
		}

		// Turn to percent
		const modifiedScore = Math.min(100, Math.floor(chosenScore * 100))

		// Randomize between modified score and 100
		// BECAUSE THAT'S HOW KARAOKE WORKS
		const randomizedScore = Math.floor(Math.random() * (100 - modifiedScore + 1)) + modifiedScore

		console.log('='.repeat(20))
		console.log('SCORE DATA')
		console.log('='.repeat(20))
		console.log('Max:', Math.max(...scores))
		console.log('Average:', scores.reduce((a, b) => a + b, 0)/scores.length)
		console.log('Root Mean Square:', (scores.reduce((a, b) => a + b*b, 0)/scores.length)**0.5)
		console.log('Chosen Score:', chosenScore)
		console.log('Modified Score:', modifiedScore)
		console.log('Randomized Score:', randomizedScore)
		console.log(scores)
		
		startEndAnimation(randomizedScore)
	
	} catch (err) {

		console.error(err)
		alert('Failed to analyze audio at the end.')
		clearAudio()

	}

	resetVariables()

}
