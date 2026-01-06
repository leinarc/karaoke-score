var volume

function setVolume(input) {
	volume = Math.min(Math.max(Number(input.value) || 0, 0), 100)

	document.getElementById('drum-roll').volume = volume/100
	document.getElementById('good-ending').volume = volume/100
	document.getElementById('normal-ending').volume = volume/100
	document.getElementById('bad-ending').volume = volume/100

	document.getElementById('sound-test').volume = volume/100
	document.getElementById('sound-test').currentTime = 0
	document.getElementById('sound-test').play()

	return volume
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

		// Default on
		constraints[constraint] = true

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

			removeMicAudio()

			await getMicAudio()

			reconnectStreams()

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