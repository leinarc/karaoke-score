var wakeLock

async function requestWakeLock() {

	if (wakeLock !== undefined) {

		try {

			await wakeLock.release()

		} catch (err) {

			console.error(err)
			console.log('Could not release wake lock.')

		}

	}

	try {

		wakeLock = await navigator.wakeLock.request("screen")

	} catch (err) {

		console.error(err)
		console.log('Could not request wake lock.')
		wakeLock = undefined

	}

}

async function releaseWakeLock() {

	try {

		await wakeLock.release()

	} catch (err) {

		console.error(err)
		console.log('Could not release wake lock.')

	}

	wakeLock = undefined

}

var animationInterval
var animationTimeout

const soundRoll = new Audio('sounds/karaoke-roll.ogg')
const soundGood = new Audio('sounds/karaoke-good.ogg')
const soundNormal = new Audio('sounds/karaoke-normal.ogg')
const soundBad = new Audio('sounds/karaoke-bad.ogg')

function startEndAnimation(score) {
	
	displayVisualizer()
	displayKey()

	const message = generateMessage(score)
	const emoji = generateEmoji()

	const effect1 = score < 50
	const effect2 = score >= 50
	const effect3 = score >= 80
	const effect4 = score >= 90
	const effect5 = score >= 95
	const effect6 = score >= 100
	const effect39 = score == 39

	const gif = getGIF(score)
	
	document.getElementById('showing-score').checked = true
	document.getElementById('show-score').checked = true
	document.getElementById('message').innerText = emoji

	soundRoll.play()

	clearInterval(animationInterval)
	animationInterval = setInterval(() => {
		document.getElementById('score').innerText = Math.floor(Math.random()*100)
	}, 33)

	clearTimeout(animationTimeout)
	animationTimeout = setTimeout(() => {
		clearInterval(animationInterval)

		document.getElementById('showing-score').checked = false
		document.getElementById('show-background').checked = true
		document.getElementById('gif').style.backgroundImage = `url("${gif}")`

		document.getElementById('effect1').checked = effect1
		document.getElementById('effect2').checked = effect2
		document.getElementById('effect3').checked = effect3
		document.getElementById('effect4').checked = effect4
		document.getElementById('effect5').checked = effect5
		document.getElementById('effect6').checked = effect6
		document.getElementById('effect39').checked = effect39

		document.getElementById('score').innerText = score
		document.getElementById('message').innerText = message

		getEndingAudio(score).play()
	}, 5000)
}

function stopEndAnimation() {
	clearInterval(animationInterval)
	clearTimeout(animationTimeout)

	displayVisualizer()
	displayKey()
	
	soundRoll.pause()
	soundGood.pause()
	soundNormal.pause()
	soundBad.pause()
	soundRoll.currentTime = 0
	soundBad.currentTime = 0
	soundNormal.currentTime = 0
	soundBad.currentTime = 0

	document.getElementById('show-background').checked = false
	document.getElementById('showing-score').checked = false
	document.getElementById('show-score').checked = false
	document.getElementById('effect1').checked = false
	document.getElementById('effect2').checked = false
	document.getElementById('effect3').checked = false
	document.getElementById('effect4').checked = false
	document.getElementById('effect5').checked = false
	document.getElementById('effect6').checked = false
	document.getElementById('effect39').checked = false

	document.getElementById('score').innerText = ''
	document.getElementById('message').innerText = ''
}



function generateMessage(score) {
	const messages =
		score < 50 ? [
			"Oh no",
			"Just a little more practice",
			"Practice makes perfect",
			"Tagay na pre"
		] :
		score < 60 ? [
			"Good warmup",
			"It's okay"
		] :
		score < 70 ? [
			"Put more effort into it"
		] :
		score < 80 ? [
			"You can do it!", "I'm rooting for you!"
		] :
		score < 90 ? [
			"Like a professional!",
			"Very good singing!"
		] :
		score < 95 ? [
			"You go girl!",
			"A Diva in the making!"
		] :
		score < 99 ? [
			"WOOOOOOO!",
			"Hell yeah go brag about it"
		] :
		score < 100 ? [
			"NOOOO YOU CHOKED IT",
			"Reach for the stars!"
		] :
		[
			"OHHH MY GHDAWDAHDJASDHAJGWL HASDLHA",
			"You're a great singer!",
			"Mahal kita",
			"ITZA PERFECT"
		]

	return chooseRandom(messages)
}

function generateEmoji() {
	const emojis = [
		":O",
		":D",
		"(╭ರ_•́)",
		"(ﾟヘﾟ)",
		"♪┏(˶⎚-⎚˶)┛♪",
		"٩(⸝⸝ᵕᴗᵕ⸝⸝)و*̣̩⋆̩*",
		"(„• ֊ •„)੭",
		"(ㅅ´ ˘ `)",
		"(  ˃̣̣̥ ꒳ ˂̣̣̥)ㅅ",
		"ヾ(´〇`)ﾉ🎙️ ♪🎶♪ ♪",
		"♪( ´θ｀)ノ",
		"♬ ♪ ٩(ˊᗜˋ*)و",
		"✨-(°▽°)-~♪"
	]

	return chooseRandom(emojis) 
}

function chooseRandom(choices) {
	return choices[Math.floor(Math.random() * choices.length)]
}



const maxLoudnessDecay = 0.001
var lastLoudnessDisplayDate

var prevLoudness

var loudnessAnimationTime

function displayLoudness(loudness) {

	const button = document.getElementById('finish-button')
	const time = fftSampleInterval / audioContext?.sampleRate + 0.01  || 0

	if (loudnessAnimationTime !== time) {
		button.style.transition = `
			font-weight 0.2s ease-out,
			font-size 0.2s ease-out,
			text-shadow 0.2s ease-out,
			width 0.2s ease-out,
			height 0.2s ease-out,
			outline-width ${time}s ease,
			box-shadow ${time}s ease
		`
	}



	const date = Date.now()

	const maxDifference = (date - lastLoudnessDisplayDate) * maxLoudnessDecay
	
	if (prevLoudness !== undefined) {
		if (prevLoudness - loudness > maxDifference) {
			loudness = prevLoudness - maxDifference
		}
	}

	button.style.outlineWidth = Math.log10(loudness + 1) * 8 + "em"
	button.style.boxShadow = `0 0 ${loudness + 0.5}em var(--fg)`;

	prevLoudness = loudness

	lastLoudnessDisplayDate = date

	loudnessAnimationTime = time

}


var qualityAnimationTime

function displayQuality(quality) {

	const buttonContainer = document.getElementById('finish-button-container')
	const time = fftSampleInterval / audioContext?.sampleRate + 0.01  || 0

	if (qualityAnimationTime !== time) {
		buttonContainer.style.transition = `
			outline-width ${Math.max(time, 0.5)}s ease-out,
			outline-offset ${Math.max(time, 0.5)}s ease-out,
			outline-color 0.05s ease-out
		`
	}



	buttonContainer.style.outlineWidth = quality + "em"
	buttonContainer.style.outlineOffset = (1 - quality) * 0.5 - 0.25 + "em"

	if (quality > 0.5) {
		buttonContainer.style.outlineColor = "white"
	} else {
		buttonContainer.style.outlineColor = "#ffffff77"
	}

	qualityAnimationTime = time

}



var visualizerAnimationTime
// var visualizerSize

function displayVisualizer(fullChroma) {

	const visualizer = document.getElementById('visualizer')
	// const visualizer2 = document.getElementById('visualizer2')
	// const visualizer2Polygon = document.getElementById('visualizer2-polygon')
	const time = fftSampleInterval / audioContext?.sampleRate + 0.01  || 0

	let i = 0
	// let points = '0,1 '

	for (let j = 0; j < fullChroma?.length; j++) {

		let level = fullChroma[j]

		if (level === undefined) {
			if (i === 0) continue;

			level = 0
		}

		const barID = 'visualizer-bar-' + i
		let bar = document.getElementById(barID)

		if (!bar) {
			bar = document.createElement('div')
			bar.id = barID
			setAnimation()
			visualizer.appendChild(bar)
		} else if (visualizerAnimationTime !== time) {
			setAnimation()
		}

		function setAnimation() {
			bar.style.transition = `
				height ${Math.max(time, 0.1)}s linear,
				opacity ${time}s linear,
				background-color 2s ease-out
			`
		}

		level = Math.max(0, Math.min(1, level || 0))
		bar.style.height = level*100 + '%'
		bar.style.opacity = level*50 + 50 + '%'

		// points += `${i},${1 - level} `

		i++

	}

	// const size = i

	// points += `${size-1},1`

	for (; true; i++) {

		const bar = document.getElementById('visualizer-bar-' + i)

		if (!bar) break;

		visualizer.removeChild(bar)

	}


	// if (visualizerSize !== size) {
	// 	visualizer2.setAttribute('viewBox', `0 0 ${size - 1} 1`)
	// }
	
	// visualizer2Polygon.setAttribute('points', points)

	// visualizerSize = size
	visualizerAnimationTime = time
	
}



function displayKey(key) {
	
	if (key === undefined) {
		for (let i = 0; true; i++) {
			
			const bar = document.getElementById('visualizer-bar-' + i)

			if (!bar) return;

			bar.style.backgroundColor = 'var(--accent2)'

		}
	}

	const profile = rotateProfile(onKeyNotes, key)
	
	for (let i = 0; true; i++) {

		const bar = document.getElementById('visualizer-bar-' + i)

		if (!bar) return;

		if (profile[(i + startNote) % 12]) {
			bar.style.backgroundColor = 'var(--accent2-light)'
		} else {
			bar.style.backgroundColor = 'var(--accent2)'
		}

	}

}



function getEndingAudio(score) {
	const audio =
		score < 50 ? soundBad :
		score < 90 ? soundNormal :
		soundGood

	return audio
}

const gifCount = {
	bad: 7,
	normal: 8,
	good: 17,
	miku: 29
}

function getGIF(score) {
	const rating =
		score == 39 ? 'miku' :
		score < 50 ? 'bad' :
		score < 90 ? 'normal':
		'good'

	const gifID = Math.floor(Math.random() * gifCount[rating]) + 1

	return 'gifs/' + rating + gifID + '.gif'
}



function toggleFullscreen() {
	//const wasFullscreen = !!document.fullscreenElement
	const isFullscreen = !document.fullscreenElement

	if(isFullscreen) {
		document.documentElement.requestFullscreen()
	} else {
		document.exitFullscreen()
	}
}

document.addEventListener("fullscreenchange", checkFullscreen)

function checkFullscreen() {
	const isFullscreen = !!document.fullscreenElement

	document.getElementById('showing-score').checked = false
	document.getElementById('is-fullscreen').checked = isFullscreen
	document.getElementById('fullscreen-text').innerText = isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"
}



function openSettings() {
	document.getElementById('is-settings-open').checked = true
	document.getElementById('is-settings-closed').checked = false
	document.getElementById('settings-container').scrollTo(0, 0)

	displaySettings()
}

function closeSettings() {
	document.getElementById('is-settings-open').checked = false
	document.getElementById('is-settings-closed').checked = true
}

function displaySettings() {
	const settings = exportSettings()

	for (const setting in settings) {
		const state = settings[setting]

		setInput(setting + '-input', state)
		setInput(setting + '-slider', state)
		setInput(setting + '-button', state)
	}

	function setInput(inputName, state) {
		const input = document.getElementById(inputName)
		if (input) {
			input.value = state.value
			if (state.className !== undefined) {
				input.className = state.className
			}
		}
	}
}

onScriptLoad()
