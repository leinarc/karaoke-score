// Reference 1: https://github.com/cwilso/PitchDetect
// Reference 2: https://davidtemperley.com/wp-content/uploads/2015/12/temperley-ms04.pdf
// Reference 3: http://www.publishingindia.com/GetBrochure.aspx?query=UERGQnJvY2h1cmVzfC80NTkucGRmfC80NTkucGRm

// values paired with worklet processors
const maxNoteCount = 128
const maxBufferSize = 128
const maxFFTSize = 8192
const minFFTSize = 8192

// should only be a power of 2
var fftSize = 8192

var fftSampleInterval = maxBufferSize

const fftChannels = 1

// for key chroma; 21-108 (88 notes) = A0-C8 (88-key piano)
const startNote = 21 // starting note; 69 = A4 440hz
const noteCount = 88

var	audioContext
var stream
var source
var loopback

var analyser
var analyserInterval

var sensitivities


function setFFTSize(size) {
	fftSize = size
}

function setFFTSampleInterval(sampleInterval) {
	fftSampleInterval = sampleInterval
}



async function startKaraoke() {

	if (!audioContext) {
		await getMicAudio()
	}

	stopEndAnimation()

	await connectAnalyser()
	
	await requestWakeLock()

}

async function finishKaraoke() {

	disconnectAnalyser()

	try {

		const score = getFinalScore()

		startEndAnimation(score)
	
	} catch (err) {

		console.error(err)
		alert('Failed to analyze audio at the end.\n' + err)

	}

	resetVariables()
	
	await releaseWakeLock()

}

async function toggleLoopback(input) {

	if (loopback) {

		disconnectLoopback()

	} else {

		if (!confirm('This may cause a feedback loop if you are using a speaker.\n\nDo you want to continue?')) {
			return
		}

		if (!audioContext) {
			await getMicAudio()
		}

		await connectLoopback()

	}

}



async function getMicAudio() {

	if (!audioContext) {
		audioContext = new AudioContext()
	}
	
	try {

		stream = await navigator.mediaDevices.getUserMedia(
			{
				"audio": constraints,
			}
		)

	} catch (err) {

		alert('Failed to get microphone audio.\n' + err)
		throw err

	}


	try {

		source = audioContext.createMediaStreamSource(stream)

	} catch (err) {

		console.error(err)
		console.log('Failed to create source from mic audio.')
		clearAudio()

	}


}

async function removeMicAudio() {

	try {
		source.disconnect()
	} catch (err) {
		console.error(err)
		console.log('Failed to disconnect source.')
	}

	try {
		stream.getTracks().forEach(track => {
			try {
				track.stop()
			} catch (err) {
				console.error(err)
				console.log('Failed to stop track.')
			}
		})
	} catch (err) {
		console.error(err)
		console.log('Failed to get stream tracks.')
	}

	source = undefined
	stream = undefined

}



async function clearAudio() {

	const oldContext = audioContext;

	if (analyserInterval !== undefined) {
		clearInterval(analyserInterval)
		analyserInterval = undefined
	}

	try {
		analyser?.disconnect()
	} catch (err) {
		console.error(err)
		console.log('Clear Audio: Failed to disconnect analyser.')
	}

	try {
		source?.disconnect()
	} catch (err) {
		console.error(err)
		console.log('Clear Audio: Failed to disconnect source.')
	}

	try {
		stream?.getTracks().forEach(track => {
			try {
				track.stop()
			} catch (err) {
				console.error(err)
				console.log('Clear Audio: Failed to stop track.')
			}
		})
	} catch (err) {
		console.error(err)
		console.log('Clear Audio: Failed to get stream tracks.')
	}

	analyser = undefined
	loopback = undefined
	source = undefined
	stream = undefined
	audioContext = undefined

	document.getElementById('start-button-container').style.display = 'flex'
	document.getElementById('finish-button-container').style.display = 'none'

	const loopbackButton = document.getElementById('test-microphone-button')
	loopbackButton.value = 'Test Microphone'
	loopbackButton.className = ''

	try {
		await oldContext?.close()
	} catch (err) {
		console.error(err)
		console.log('Clear Audio: Failed to close audio context.')
	}

}



async function connectAnalyser() {

	try {

		if (analyser) {
			source.disconnect(analyser)
		}

		// if auto || wasm-worklet
		await createWorkletAnalyser('wasm')
		// if js-worklet
		// await createWorkletAnalyser()
		// if js
		// createNativeAnalyser()

		source.connect(analyser)

		document.getElementById('start-button-container').style.display = 'none'
		document.getElementById('finish-button-container').style.display = 'flex'

	} catch (err) {

		console.error(err)
		console.log('Failed to connect analyser.')
		clearAudio()

	}

}

function disconnectAnalyser() {

	if (analyserInterval !== undefined) {
		clearInterval(analyserInterval)
		analyserInterval = undefined
	}

	let clearAfter = false

	try {

		if (analyser) {
			source.disconnect(analyser)
		}

	} catch (err) {

		console.error(err)
		console.log('Failed to disconnect analyser.')
		clearAfter = true

	}

	analyser = undefined

	document.getElementById('start-button-container').style.display = 'flex'
	document.getElementById('finish-button-container').style.display = 'none'

	if (!loopback || clearAfter) {
		clearAudio()
	}
	
}



async function connectLoopback() {

	try {

		loopback = audioContext.destination

		source.connect(loopback)

		const loopbackButton = document.getElementById('test-microphone-button')
		loopbackButton.value = 'Stop Loopback'
		loopbackButton.className = 'button2'

	} catch (err) {

		console.error(err)
		console.log('Failed to connect loopback.')
		clearAudio()

	}

}

function disconnectLoopback() {

	let clearAfter = false

	try {

		source.disconnect(loopback)
		
		loopback = undefined

		const loopbackButton = document.getElementById('test-microphone-button')
		loopbackButton.value = 'Test Microphone'
		loopbackButton.className = ''

	} catch (err) {

		console.error(err)
		console.log('Failed to disconnect loopback.')
		clearAfter = true

	}

	if (!analyser || clearAfter) {
		clearAudio()
	}

}

async function reconnectStreams() {

	if (!audioContext) {
		return
	}

	let clearAfter = false

	try {
		
		if (analyser) {
			source.connect(analyser)
		}

	} catch (err) {

		console.error(err)
		console.log('Failed to reconnect analyser.')
		clearAfter = true

	}

	try {
		
		if (loopback) {
			source.connect(loopback)
		}

	} catch (err) {

		console.error(err)
		console.log('Failed to reconnect loopback.')
		clearAfter = true

	}

	if (clearAfter) {
		clearAudio()
	}

}



onScriptLoad()