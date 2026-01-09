var animationInterval
var animationTimeout

const soundRoll = new Audio('sounds/karaoke-roll.ogg')
const soundGood = new Audio('sounds/karaoke-good.ogg')
const soundNormal = new Audio('sounds/karaoke-normal.ogg')
const soundBad = new Audio('sounds/karaoke-bad.ogg')

createVisualizerBars()

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

function displayLoudness(loudness) {

	const date = Date.now()

	const maxDifference = (date - lastLoudnessDisplayDate) * maxLoudnessDecay
	
	if (prevLoudness !== undefined) {
		if (prevLoudness - loudness > maxDifference) {
			loudness = prevLoudness - maxDifference
		}
	}

	document.getElementById('finish-button').style.outlineWidth = Math.log10(loudness + 1) * 8 + "em"
	document.getElementById('finish-button').style.boxShadow = `0 0 ${loudness + 0.5}em var(--fg)`;

	prevLoudness = loudness

	lastLoudnessDisplayDate = date

}

function displayQuality(quality) {
	document.getElementById('finish-button-container').style.outlineWidth = quality + "em"
	document.getElementById('finish-button-container').style.outlineOffset = (1 - quality) * 0.5 - 0.25 + "em"

	if (quality > 0.5) {
		document.getElementById('finish-button-container').style.outlineColor = "white"
	} else {
		document.getElementById('finish-button-container').style.outlineColor = "#ffffff77"
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



function displayVisualizer(fullChroma) {
	for (let i = 0; i < noteCount; i++) {
		const bar = document.getElementById('visualizer-bar-' + i)
		const note = i + startNote
		const level = Math.max(0, Math.min(1, fullChroma?.[note] || 0))
		bar.style.height = level*100 + '%'
		bar.style.opacity = level*50 + 50 + '%'
	}
}

function displayKey(key) {
	if (key === undefined) {
		for (let i = 0; i < noteCount; i++) {
			const bar = document.getElementById('visualizer-bar-' + i)
			bar.style.backgroundColor = 'var(--fg)'
		}
		return
	}

	const profile = rotateProfile(onKeyNotes, key)
	
	for (let i = 0; i < noteCount; i++) {
		const bar = document.getElementById('visualizer-bar-' + i)
		const note = i + startNote
		if (profile[note % 12]) {
			bar.style.backgroundColor = 'var(--fg)'
		} else {
			bar.style.backgroundColor = 'var(--accent2)'
		}
	}
}

function createVisualizerBars() {
	const visualizer = document.getElementById('visualizer')
	for (let i = 0; i < noteCount; i++) {
		const bar = document.createElement('bar')
		bar.id = 'visualizer-bar-' + i
		visualizer.appendChild(bar)
	}
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
	document.getElementById('settings').scrollTo(0, 0)

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
