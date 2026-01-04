const segmentInterval = 5000
const segmentLimit = 4
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
	nextKeyData = nextKeyData.next
	nextMelodyData = nextMelodyData.next
}



function analyseAudio() {
	
	try {

		analyser.getFloatTimeDomainData(tdBuffer)
		analyser.getFloatFrequencyData(fftBuffer)

		if (lastMelodyData.length <= 0) {
			lastSegmentDate = Date.now()
		}

		lastMelodyData.push(getMelodyFreq(tdBuffer))

		const notes = getKeyNotes(fftBuffer)
		notes.forEach((note, i) => {
			if (note) lastKeyData[i] = 1
		})

		if (
			lastMelodyData.length &&
			lastKeyData.length &&
			Date.now() >= lastSegmentDate + segmentInterval
		) {
			if (segmentCount >= segmentLimit) {
				const key = getKey(lastSegmentKey, nextKeyData)
				const newScores = getScores(key, nextMelodyData)
				scores.push(...newScores)

				lastSegmentKey = key

				removeSegment()

				console.log('Detected key:', keyNames[key])
			} else {
				segmentCount++
			}

			addSegment()
		}

	} catch (err) {

		clearAudio()
		console.error(err)
		alert('Failed to analyze audio.')

	}

}



async function finish() {

	await clearAudio()

	if (nextMelodyData.length && nextKeyData.length) {
		const keys = getKeys(lastSegmentKey, nextKeyData)
		var melodyData = nextMelodyData

		for (const key of keys) {
			const newScores = getScores(key, melodyData)
			scores.push(...newScores)
			melodyData = melodyData.next
		}

		console.log('Detected keys:', keys.map(key => keyNames[key]).join('\t'))
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
	const radomizedScore = Math.floor(Math.random() * (100 - modifiedScore + 1)) + modifiedScore

	console.log('='.repeat(20))
	console.log('SCORE DATA')
	console.log('='.repeat(20))
	console.log('Max:', Math.max(...scores))
	console.log('Average:', scores.reduce((a, b) => a + b, 0)/scores.length)
	console.log('Root Mean Square:', (scores.reduce((a, b) => a + b*b, 0)/scores.length)**0.5)
	console.log('Chosen Score:', chosenScore)
	console.log('Modified Score:', modifiedScore)
	console.log('Randomized Score:', radomizedScore)
	console.log(scores)

	const finalScore = radomizedScore

	const effect1 = finalScore < 50
	const effect2 = finalScore >= 50
	const effect3 = finalScore >= 80
	const effect4 = finalScore >= 90
	const effect5 = finalScore >= 95
	const effect6 = finalScore >= 100

	message =
		finalScore < 50 ? chooseRandom("Oh no", "Just a little more practice") :
		finalScore < 60 ? "Good warmup" :
		finalScore < 70 ? "Put more effort into it" :
		finalScore < 80 ? chooseRandom("You can do it!", "Good enough") :
		finalScore < 90 ? chooseRandom("So close!", "Very good singing!") :
		finalScore < 95 ? chooseRandom("You go girl!", "A Diva in the making!") :
		finalScore < 99 ? chooseRandom("WOOOOOOO!", "Hell yeah go brag about it") :
		finalScore < 100 ? chooseRandom("NOOOO YOU CHOKED IT", "Reach for the stars!") :
		chooseRandom("OHHH MY GHDAWDAHDJASDHAJGWL HASDLHA", "You're a great singer!", "Mahal kita")
		
	document.getElementById('show-score').checked = true
	document.getElementById('message').innerText = chooseRandom(":O", "(╭ರ_•́)", "(ﾟヘﾟ)", ":D", "♪┏(˶⎚-⎚˶)┛♪", "٩(⸝⸝ᵕᴗᵕ⸝⸝)و*̣̩⋆̩*", "(„• ֊ •„)੭", "(ㅅ´ ˘ `)", "(  ˃̣̣̥ ꒳ ˂̣̣̥)ㅅ", "ヾ(´〇`)ﾉ🎙️ ♪🎶♪ ♪", "♪( ´θ｀)ノ", "♬ ♪ ٩(ˊᗜˋ*)و", "✨-(°▽°)-~♪") 
	
	clearInterval(animationInterval)
	animationInterval = setInterval(() => {
		document.getElementById('score').innerText = Math.floor(Math.random()*100)
	}, 33)

	clearTimeout(animationTimeout)
	animationTimeout = setTimeout(() => {
		clearInterval(animationInterval)
		document.getElementById('score').innerText = finalScore
		document.getElementById('message').innerText = message
		document.getElementById('effect1').checked = effect1
		document.getElementById('effect2').checked = effect2
		document.getElementById('effect3').checked = effect3
		document.getElementById('effect4').checked = effect4
		document.getElementById('effect5').checked = effect5
		document.getElementById('effect6').checked = effect6
	}, 5000)

	resetVariables()

}


function chooseRandom(...choices) {
	return choices[Math.floor(Math.random() * choices.length)]
}