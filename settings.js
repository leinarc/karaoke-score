var volume
var calculation
var randomization

const calculationNames = [
	"Weighted Probability Selection",
	"Equal Probability Selection",
	"Root Mean Square",
	"Average"
]

const randomizationNames = [
	"Calculated score to 100",
	"Don't randomize",
	"0 to calculated score"
]

resetSettings()

function resetSettings() {
	volume = 100
	calculation = 0
	randomization = 0

	displaySettings()
}

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

function cycleCalculation() {
	calculation = (calculation + 1) % calculationNames.length

	return calculationNames[calculation]
}

function cycleRandomization() {
	randomization = (randomization + 1) % randomizationNames.length

	return randomizationNames[randomization]
}

function exportSettings() {
	return {
		volume,
		calculation: calculationNames[calculation],
		randomization: randomizationNames[randomization]
	}
}