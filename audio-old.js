// Reference 1: https://whatnoteisthis.com/

const minVocalFreq = 50
const maxVocalFreq = 800

const minInstrFreq = 50
const maxInstrFreq = 3200

const fftSize = 8192

var tdBuffer
var fftBuffer

var	audioContext
var analyser
var analyseInterval
const analyseIntervalTime = 10


// Controls the number of fft data needed to determine a key
const keyDataSize = 512
const keyDataSkip = 128
var keyData = []
var melodyData = []
var scores = []

var mode = undefined
var tonic = undefined


const keyProfiles = [
	// Notes
	// [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1],
	// Krumhansl–Kessler profiles
	// [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], // Major
	// [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] // Minor
	// Kostka-Payne corpus
	// [.748, .060, .488, .082, .670, .460, .096, .715, .104, .366, .057, .400], // Major
	// [.712, .084, .474, .618, .049, .460, .105, .747, .404, .067, .133, .330] // Minor
]

/*// Square Root
for (var mode = 0; mode < keyProfiles.length; mode++) {
	const modeProfile = keyProfiles[mode]

	for (var note = 0; note < modeProfile.length; note++) {
		modeProfile[note] = modeProfile[note]**0.5
	}
}

// Set average as zero
for (var mode = 0; mode < keyProfiles.length; mode++) {
	const modeProfile = keyProfiles[mode]
	const avg = modeProfile.reduce((a, b) => a + b, 0) / modeProfile.length

	for (var note = 0; note < modeProfile.length; note++) {
		modeProfile[note] -= avg
	}
}*/

// Normalize profiles
for (var mode = 0; mode < keyProfiles.length; mode++) {
	const modeProfile = keyProfiles[mode]
	const norm = Math.hypot(...modeProfile)

	for (var note = 0; note < modeProfile.length; note++) {
		modeProfile[note] /= norm
	}
}

console.log(keyProfiles)

const onKeyNotes = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1]

const modeNames = "Major Minor".split(' ')
const noteNames = "C C# D D# E F F# G G# A A# B".split(' ')

async function getMicAudio() {
	try {

		audioContext = new AudioContext()

		const stream = await navigator.mediaDevices.getUserMedia(
			{
				"audio": {
					/*"echoCancellation": false,
					"autoGainControl": false,
					"noiseSuppression": false,
					"highpassFilter": false,
					"typingNoiseDetection": false,
					"googEchoCancellation": false,
					"googAutoGainControl": false,
					"googNoiseSuppression": false,
					"googHighpassFilter": false,
					"googTypingNoiseDetection": false*/
				},
			}
		)
		
		const mediaStreamSource = audioContext.createMediaStreamSource(stream)

		analyser = audioContext.createAnalyser()
		analyser.fftSize = fftSize;
		tdBuffer = new Float32Array(analyser.fftSize)
		fftBuffer = new Float32Array(analyser.frequencyBinCount)
		mediaStreamSource.connect(analyser)

		clearInterval(analyseInterval)
		analyseInterval = setInterval(analyseAudio, analyseIntervalTime)

	} catch (err) {

		console.error(err)
		alert('Failed to get mic audio.')

	}
}

function getStreamAudio(stream) {
	
	try {

		audioContext = new AudioContext()

		mediaStreamSource = audioContext.createMediaStreamSource(stream)

		analyser = audioContext.createAnalyser()
		analyser.fftSize = fftSize;
		tdBuffer = new Float32Array(analyser.fftSize)
		fftBuffer = new Float32Array(analyser.frequencyBinCount)
		mediaStreamSource.connect(analyser)

		clearInterval(analyseInterval)
		analyseInterval = setInterval(analyseAudio, analyseIntervalTime)

	} catch (err) {

		console.error(err)
		alert('Failed to get stream audio.')

	}

}



function analyseAudio() {
	
	try {

		analyser.getFloatTimeDomainData(tdBuffer)
		analyser.getFloatFrequencyData(fftBuffer)

		melodyData.push(getMelody())

		// Convert from dB to linear
		const fftData = fftBuffer.map(db => Number.isFinite(db) ? Math.pow(10, db / 20) : 0)
		keyData.push(fftData)

		if (keyData.length >= keyDataSize) {

			var chunkSize = keyDataSkip

			const [newMode, newTonic] = getKey()

			if (newMode !== undefined && newTonic !== undefined) {

				if (newMode !== mode || newTonic !== tonic) {
					chunkSize = Math.floor(keyData.length/2)
				}

				if (mode !== undefined && tonic !== undefined) {
					getScore(chunkSize)

				}

				mode = newMode
				tonic = newTonic

				if (mode === undefined || tonic === undefined) {
					getScore(chunkSize)
				}

			} else if (mode !== undefined && tonic !== undefined) {

				getScore(chunkSize)
				
			} else {

				return

			}

			keyData = keyData.slice(chunkSize)
			melodyData = melodyData.slice(chunkSize)

		}

	} catch (err) {

		clearInterval(analyseInterval)
		console.error(err)
		alert('Failed to analyze audio.')

	}

}



function getMelody() {

	// Reference 1 says something about ACF2+, idk what that is
	// Oh ok I get it now, this is detecting at which frequency the audio wave aligns with itself
	var rms = 0

	for (var i = 0; i < fftSize; i++) {
		const val = tdBuffer[i]
		rms += val * val
	}

	rms = Math.sqrt(rms / fftSize);

	if (rms < 0.01) { // not enough signal
		return -1
	}

	var r1 = 0
	var r2 = fftSize - 1
	const thres = 0.2

	for (var i = 0; i < fftSize / 2; i++) {
		if (Math.abs(tdBuffer[i]) < thres) {
			r1 = i
			break
		}
	}

	for (var i = 0; i < fftSize / 2; i++) {
		if (Math.abs(tdBuffer[fftSize - i]) < thres) {
			r2 = fftSize - i
			break
		}
	}

	const chunk = tdBuffer.slice(r1,r2)
	const chunkSize = chunk.length

	var c = new Array(chunkSize).fill(0);
	for (var i = 0; i < chunkSize; i++) {
		for (var j = 0; j < chunkSize-i; j++) {
			c[i] = c[i] + chunk[j] * chunk[j+i]
		}
	}

	const sampleRate = audioContext.sampleRate

	// Use gaussian to limit vocal range
	const minLag = sampleRate / maxVocalFreq
	const maxLag = sampleRate / minVocalFreq
	const center = (minLag + maxLag) / 2;
	const sigma = (maxLag - minLag) / 6;
	for (var i = 0; i < chunkSize; i++) {
		const d = i - center
		c[i] *= Math.exp(-(d*d)/(2*sigma*sigma))
	}

	var d=1
	while (c[d] > c[d+1]) {
		d++
	}

	const valthres = 1

	var maxval = -1
	var maxpos = -1
	for (var i = d; i < chunkSize; i++) {
		const freq = sampleRate / i
		
		// Limit to vocal range
		// if (freq < minVocalFreq) continue
		// if (freq > maxVocalFreq) break

		if (c[i] > maxval && c[i] > valthres) {
			maxval = c[i]
			maxpos = i
		}
	}

	var T0 = maxpos;

	const x1 = c[T0-1]
	const x2 = c[T0]
	const x3 = c[T0+1]
	const a = (x1 + x3 - 2*x2) / 2
	const b = (x3 - x1)/2
	if (a) {
		T0 = T0 - b / (2*a)
	}

	return sampleRate / T0

}



function getKey(ignoreThreshold) {

	const chroma = new Array(12).fill(0)

	const aggData = []
	for (const fftData of keyData) {
		for (var i = 0; i < fftData.length; i ++) {
			aggData[i] = (aggData[i] || 0) + fftData[i]
		}
	}

	const sampleRate = audioContext.sampleRate

	// Bins to notes/pitch class
	for (var i = 1; i < aggData.length; i++) {

		var value = aggData[i]

		const freq = i / (aggData.length - 1) * sampleRate / 2;

		// Limit to instrument range
		// if (freq < minInstrFreq) continue
		// if (freq > maxInstrFreq) break
		// Use linkwitz-riley filter
		value *= (freq / minInstrFreq)**4 / (1 + (freq / minInstrFreq)**4)
		value *= 1 / (1 + (freq / maxInstrFreq)**4)

		const midi = 69 + 12 * Math.log2(freq / 440);

		const pitchClass = midi % 12;

		const class1 = Math.floor(pitchClass);
		const class2 = (class1 + 1) % 12;

		const frac = pitchClass - class1
		
		chroma[class1] += value * (1 - frac)**3
		chroma[class2] += value * frac**3

	}

	// Set minimum as zero
	const min = Math.min(...chroma)
	for (var i = 0; i < 12; i++) {
		chroma[i] -= min
	}

	// Square
	for (var i = 0; i < 12; i++) {
		chroma[i] *= chroma[i]
	}

	// Normalize
	{
		const norm = Math.hypot(...chroma)

		for (var i = 0; i < 12; i++) {
			chroma[i] /= norm
		}
	}

	// Also acts as threshold
	var bestScore = ignoreThreshold ? -1 : keyDataSize / keyData.length / 2
	var bestMode
	var bestTonic

	console.log(chroma.map(x => x.toFixed(3)).join('\t'))

	// Choose the best fitting key
	for (var mode = 0; mode < keyProfiles.length; mode++) {
		const modeProfile = keyProfiles[mode]
		for (var tonic = 0; tonic < modeProfile.length; tonic++) {
			const profile = modeProfile.slice(-tonic).concat(modeProfile.slice(0, modeProfile.length-tonic))

			var score = 0

			for (var j = 0; j < 12; j++) {
				score += chroma[j] * profile[j]
			}

			//console.log(`${noteNames[tonic]} ${modeNames[mode]}: ${score}`)

			if (score > bestScore) {
				bestScore = score
				bestMode = mode
				bestTonic = tonic
			}
		}
	}

	if (bestMode !== undefined && bestTonic !== undefined) {
		console.log(`Detected key: ${noteNames[bestTonic]} ${modeNames[bestMode]}`)
	}

	return [bestMode, bestTonic]
}



function getScore(size) {

	const offset = (mode*9 + tonic) % 12
	const profile = onKeyNotes.slice(offset).concat(onKeyNotes.slice(0, offset))

	for (var i = 0; i < (size || melodyData.length); i++) {
		const freq = melodyData[i]

		if (!(freq > 0)) continue

		const midi = 69 + 12 * Math.log2(freq / 440);

		const pitchClass = midi % 12;

		const class1 = Math.floor(pitchClass);
		const class2 = (class1 + 1) % 12;

		const frac = pitchClass - class1

		const keyScore = profile[class1]*(1-frac) + profile[class2]*frac
		const noteScore = 1 - frac * (1-frac)

		scores.push(keyScore * noteScore)
	}

}



function finish() {

	clearInterval(analyseInterval)

	const [newMode, newTonic] = getKey()

	if (newMode !== undefined && newTonic !== undefined) {
		mode = newMode
		tonic = newTonic
	} else if (mode === undefined || tonic === undefined) {
		const [newMode, newTonic] = getKey(true)
		mode = newMode
		tonic = newTonic
	}

	if (melodyData.length > 0) {
		getScore()
	}

	console.log('Max:', Math.max(...scores))
	console.log('Average:', scores.reduce((a, b) => a + b, 0)/scores.length)
	console.log('Root Mean Square:', (scores.reduce((a, b) => a + b*b, 0)/scores.length)**0.5)
	console.log(scores)

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

	console.log('Chosen Score:', chosenScore)

	// Turn to percent
	const modifiedScore = Math.min(100, Math.floor(chosenScore * 100))
	console.log('Modified Score:', modifiedScore)

	// Randomize between modified score and 100
	// BECAUSE THAT'S HOW KARAOKE WORKS
	const RandomizedScore = Math.floor(Math.random() * (100 - modifiedScore + 1)) + modifiedScore
	console.log('Randomized Score:', RandomizedScore)

	keyData = []
	melodyData = []
	scores = []

	mode = undefined
	tonic = undefined

}