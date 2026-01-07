var volume
const soundTestCount = 10
const soundTests = []
var currentSoundTest = 0
var lastSoundTest = 0

for (var i = 1; i <= soundTestCount; i++) {
	const audio = new Audio('sounds/karaoke-test.ogg')
	soundTests.push(audio)
}

function setVolume(input) {
	const oldVolume = volume

	volume = Math.min(Math.max(Number(input.value) || 0, 0), 100)

	soundRoll.volume = volume/100
	soundGood.volume = volume/100
	soundNormal.volume = volume/100
	soundBad.volume = volume/100

	testSound()

	return volume
}

function testSound() {
	const audio = soundTests[currentSoundTest]
	audio.volume = volume/100
	audio.currentTime = 0.2
	audio.play()

	currentSoundTest = (currentSoundTest + 1) % soundTests.length
}



var calculation

const calculationNames = [
	"Weighted Probability Selection",
	"Equal Probability Selection",
	"Root Mean Square",
	"Average"
]

function cycleCalculation() {
	calculation = (calculation + 1) % calculationNames.length

	return calculation + ': ' + calculationNames[calculation]
}



var randomization

const randomizationNames = [
	"Calculated score to 100",
	"Don't randomize",
	"0 to calculated score"
]

function cycleRandomization() {
	randomization = (randomization + 1) % randomizationNames.length

	return randomization + ': ' + randomizationNames[randomization]
}



const audioConstraints = [
	"echoCancellation",
	"noiseSuppression",
	"typingNoiseDetection",
	"autoGainControl",
	"highpassFilter",
]

const supportedConstraints = navigator.mediaDevices.getSupportedConstraints()

const validConstraints = audioConstraints.filter(constraint => supportedConstraints[constraint])

const constraints = {}

if (validConstraints.length) {
	const title = document.createElement('div')
	title.className = 'settings-title'
	title.innerText = 'Microphone Settings'

	const settings = document.getElementById('settings')
	const test = document.getElementById('test-microphone-button')
	const table = document.createElement('table')

	const tbody = document.createElement('tbody')

	for (const constraint of validConstraints) {
		// Add constraint setting
		const inputID = 'constraint-' + constraint + '-input'
		const tr = document.createElement('tr')

		const td1 = document.createElement('td')
		const div1 = document.createElement('div')
		const label = document.createElement('label')
		label.htmlFor = inputID
		label.innerText = constraint

		const td2 = document.createElement('td')
		const div2 = document.createElement('div')
		const input = document.createElement('input')
		input.id = inputID
		input.type = 'button'

		input.onclick = async function() {

			constraints[constraint] = !constraints[constraint]

			input.value = constraints[constraint] ? 'On' : 'Off'
			input.className = constraints[constraint] ? 'button3' : ''

			if (audioContext) {
				removeMicAudio()

				await getMicAudio()

				reconnectStreams()
			}

		}

		div1.appendChild(label)
		div2.appendChild(input)
		td1.appendChild(div1)
		td2.appendChild(div2)
		tr.appendChild(td1)
		tr.appendChild(td2)
		tbody.appendChild(tr)

	}

	table.appendChild(tbody)
	settings.insertBefore(title, test)
	settings.insertBefore(table, test)
}



resetSettings()

function resetSettings() {
	volume = 100
	calculation = 0
	randomization = 0

	for (const constraint of validConstraints) {
		constraints[constraint] = true
	}

	displaySettings()
}

function exportSettings() {
	const settings = {
		volume: {
			value: volume
		},
		calculation: {
			value: calculation + ': ' + calculationNames[calculation]
		},
		randomization: {
			value: randomization + ': ' + randomizationNames[randomization]
		}
	}

	for (const constraint in constraints) {
		settings['constraint-' + constraint] = {
			value: constraints[constraint] ? 'On' : 'Off',
			className: constraints[constraint] ? 'button3' : ''
		}
	}

	return settings
}




onScriptLoad()