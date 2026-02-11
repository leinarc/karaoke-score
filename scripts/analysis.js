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

function filterDissonantNotes(keyData) {
	// Never allow a single note to remove another
	// It requires max count + 1 number of adjacent notes to remove a note
	const max = Math.max(...keyData.filter(x => x !== undefined), 0)
	const mult = 0.75**max * 0.75 + 0.25
	const oldKeyData = keyData.slice()
	oldKeyData.forEach((x, i) => {
		const p = (i+11)%12
		const n = (i+1)%12
		keyData[i] = ((oldKeyData[p]||0) + (oldKeyData[n]||0)) * mult > x ? 0 : x
	})
}



function analyseMelody(frequencies) {

	try {

		for (const freq of frequencies) {

			if (!(freq >= minMelodyFreq && freq <= maxMelodyFreq)) continue

			console.log(freq)

			if (!lastMelodyData.length && !lastKeyData.length) {
				lastSegmentDate = Date.now()
			}

			lastMelodyData.push(freq)
				
		}

		analyseAudio()

	} catch (err) {

		console.error(err)
		alert('Failed to analyze audio melody.\n' + err)
		disconnectAnalyser()

	}

}



function analyseKey(chromas) {

	if (!lastMelodyData.length && !lastKeyData.length) {
		lastSegmentDate = Date.now()
	}
	
	for (let chroma of chromas) {

		// Normalize
		const min = Math.min(...chroma)
		const max = Math.max(...chroma)
		normalizedChroma = chroma.map(x => (x - min) / (max - min || 1))
		const hypot = Math.hypot(...normalizedChroma)
		normalizedChroma = normalizedChroma.map(x => x / (hypot || 1))



		// Detect notes
		const newNotes = []
		const noteAdded = {}

		normalizedChroma.map(x => x > 0.95 ? 1 : 0).forEach(addNote)
		chroma.map(x => x > 0.9 ? 1 : 0).forEach(addNote)

		// console.log(chroma.map(x => '' + x.toFixed(3)).join('\t'))



		function addNote(count, note) {
			if (count) {
				if (noteAdded[note]) return
				noteAdded[note] = true
				lastKeyData[note] = (lastKeyData[note] || 0) + 1
				newNotes[note] = 1
			}
		}

		

		// if (newNotes.some(x => x)) {
		// 	console.log('Notes:  \t' + newNotes.map((x, i) => x ? noteNames[i] : '').join('\t'))
		// }

	}

	analyseAudio()
	
}



function analyseAudio() {

	const melodyDataOverflow = lastMelodyData.length > melodyDataLimit
	const expiredSegment = Date.now() >= lastSegmentDate + segmentInterval

	if (
		(lastMelodyData.length || expiredSegment) &&
		(lastKeyData.length || melodyDataOverflow) &&
		expiredSegment
	) {

		filterDissonantNotes(lastKeyData)

		if (segmentCount >= segmentLimit) {

			console.log(
				'Key Notes:\t' +
				nextKeyData
					// .map((x, i) => x > 0 ? noteNames[i] : '').join('\t')
					.map((x, i) => [x, i])
					.sort((a, b) => b[0] - a[0])
					.map((arr, i) =>  [...arr, i < 5])
					.sort((a, b) => a[1] - b[1])
					.reduce((a, b) => ({data: a.data.concat(new Array(b[1] - a.index),[b]), index: b[1] + 1}), {data:[], index: 0})
					.data
					.map(arr => arr[0] > 0 ? (arr[2] ? noteNames[arr[1]] : '+') : arr[2] ? '-' : '*')
					.join('\t')
			)

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

	filterDissonantNotes(lastKeyData)

	let keyData = nextKeyData
	while (keyData) {
		console.log(
			'Key Notes:\t' +
			keyData
				// .map((x, i) => x > 0 ? noteNames[i] : '').join('\t')
				.map((x, i) => [x, i])
				.sort((a, b) => b[0] - a[0])
				.map((arr, i) =>  [...arr, i < 5])
				.sort((a, b) => a[1] - b[1])
				.reduce((a, b) => ({data: a.data.concat(new Array(b[1]-a.index), [b]), index: b[1]+ 1}), {data:[], index: 0})
				.data
				.map(arr => arr[0] > 0 ? (arr[2] ? noteNames[arr[1]] : '-') : '')
				.join('\t')
		)
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