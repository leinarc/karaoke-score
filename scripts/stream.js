// Reference 1: https://whatnoteisthis.com/
// Reference 2: https://davidtemperley.com/wp-content/uploads/2015/12/temperley-ms04.pdf

// values paired with worklet processors
const safeNoteCount = 120
const safeBufferSize = 32768

const tdSize = 2048
const fftSize = 8192
const dftSize = 8192

// only used by worklet processors
const tdOverlap = 0
const dftOverlap = 0

// only used by worklet processors
const tdChannels = 1
const dftChannels = 1

// only used by native processors
const tdIntervalTime = 20
const fftIntervalTime = 500

// for dft
const startNote = 21 // starting note; 69 = A4
const noteCount = 88

// only used by worklet processors
// determines the delay when the processor gives up on a frame
const maxDelay = 50

var tdBuffer
var fftBuffer

var	audioContext
var stream
var source
var loopback
var melodyAnalyser
var keyAnalyser

var tdInterval
var fftInterval

var analyse2RAF

var analyzing

var keyWASM
var melodyWASM
var keyJS
var melodyJS

loadProcessors()



async function startKaraoke() {

	if (!audioContext) {
		await getMicAudio()
	}

	stopEndAnimation()

	connectAnalyser()

}

async function finishKaraoke() {

	disconnectAnalyser()

	try {

		const score = getFinalScore()

		startEndAnimation(score)
	
	} catch (err) {

		console.error(err)
		alert('Failed to analyze audio at the end.')

	}

	resetVariables()

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

		alert('Failed to get microphone audio.')
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

	try {
		keyAnalyser?.disconnect()
	} catch (err) {
		console.error(err)
		console.log('Clear Audio: Failed to disconnect key analyser.')
	}

	try {
		melodyAnalyser?.disconnect()
	} catch (err) {
		console.error(err)
		console.log('Clear Audio: Failed to disconnect melody analyser.')
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

	keyAnalyser = undefined
	melodyAnalyser = undefined
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

		try {

			await createWorkletMelodyAnalyser()

			melodyAnalyser.onprocessorerror = (err) => {

				console.error(err)
				console.log('Processor for worklet melody analyser failed.')
				console.log('Falling back to TD analyser...')

				source.disconnect(melodyAnalyser)
				createTDMelodyAnalyser()
				source.connect(melodyAnalyser)

			}

		} catch (err) {

			console.error(err)
			console.log('Failed to create worklet melody analyser.')
			console.log('Falling back to TD analyser...')

			createTDMelodyAnalyser()

		}

		source.connect(melodyAnalyser)

		try {

			await createWorkletKeyAnalyser()

			keyAnalyser.onprocessorerror = (err) => {

				console.error(err)
				console.log('Processor for worklet melody analyser failed.')
				console.log('Falling back to FFT analyser...')

				source.disconnect(keyAnalyser)
				createFFTKeyAnalyser()
				source.connect(keyAnalyser)

			}

		} catch (err) {

			console.error(err)
			console.log('Failed to create worklet key analyser.')
			console.log('Falling back to FFT analyser...')

			createFFTKeyAnalyser()

		}

		// keyNoise = [] // Reset noise filter
		source.connect(keyAnalyser)

		document.getElementById('start-button-container').style.display = 'none'
		document.getElementById('finish-button-container').style.display = 'flex'

	} catch (err) {

		console.error(err)
		console.log('Failed to connect analyser.')
		clearAudio()

	}

}

async function loadProcessors() {
	melodyWASM = loadProcessorWASM('processors/melody-analyser.wasm')

	keyWASM = loadProcessorWASM('processors/key-analyser.wasm')

	melodyJS = loadProcessorJS('processors/melody-analyser.js')

	keyJS = loadProcessorJS('processors/key-analyser.js')
}

function loadProcessorWASM(url) {
	return fetch(url).then(
		response => response.arrayBuffer()
	)
}

function loadProcessorJS(url) {
	return fetch(url).then(
		response => response.text()
	).then(
		text => new Blob([text], { type: 'application/javascript; charset=utf-8' })
	).then(
		blob => {
			let reader = new FileReader();
			reader.readAsDataURL(blob);
			return new Promise((resolve) => {
				reader.onloadend = () => {
					resolve(reader.result);
				}
			})
        }
	)

}

async function createWorkletMelodyAnalyser() {

	melodyWASM = await melodyWASM
	melodyJS = await melodyJS

	await audioContext.audioWorklet.addModule(melodyJS)

	const sampleRate = audioContext.sampleRate

	melodyAnalyser = new AudioWorkletNode(
		audioContext,
		'melody-analyser',
		{ 
			processorOptions: {
				tdSize,
				tdOverlap,
				tdChannels,
				sampleRate,
				melodyWASM,
				safeNoteCount,
				safeBufferSize,
				maxDelay
			}
		}
	)

	melodyAnalyser.port.onmessage = (message) => {

		if (!melodyAnalyser) {
			return
		}

		const data = message.data

		if (data instanceof Error) {
			melodyAnalyser.onprocessorerror(data)
			return
		}

		analyseMelody(data)

	}

}

async function createTDMelodyAnalyser() {

	melodyAnalyser = audioContext.createAnalyser()
	melodyAnalyser.fftSize = tdSize
	tdBuffer = new Float32Array(melodyAnalyser.fftSize)
	melodyAllTimePeak = 0

	tdInterval = setInterval( () => {

		if (!melodyAnalyser) {
			return
		}

		melodyAnalyser.getFloatTimeDomainData(tdBuffer)

		analyseMelody([[getMelodyFreq(tdBuffer)]])

	}, tdIntervalTime)

}

async function createWorkletKeyAnalyser() {

	keyWASM = await keyWASM
	keyJS = await keyJS

	await audioContext.audioWorklet.addModule(keyJS)

	const sampleRate = audioContext.sampleRate

	keyAnalyser = new AudioWorkletNode(
		audioContext,
		'key-analyser',
		{ 
			processorOptions: {
				dftSize,
				dftOverlap,
				dftChannels,
				startNote,
				noteCount,
				keyWASM,
				sampleRate,
				safeNoteCount,
				safeBufferSize,
				maxDelay
			} 
		}
	)

	keyAnalyser.port.onmessage = (message) => {

		if (!keyAnalyser) {
			return
		}

		let data = message.data

		if (data instanceof Error) {
			keyAnalyser.onprocessorerror(data)
			return
		}

		for (const channel of data) {
			for (const frame of channel) {

				const fullChroma = []

				frame[0].forEach((mag_sqr, i) => {
					fullChroma[i + startNote] = mag_sqr**0.5
				})

				frame[0] = fullChroma

			}
		}
		
		analyseKey(data)

	}

}

async function createFFTKeyAnalyser() {

	keyAnalyser = audioContext.createAnalyser()
	keyAnalyser.fftSize = fftSize
	fftBuffer = new Float32Array(keyAnalyser.frequencyBinCount)
	keyAllTimePeak = 0

	fftInterval = setInterval( () => {

		if (!keyAnalyser) {
			return
		}

		keyAnalyser.getFloatFrequencyData(fftBuffer)

		const fullChroma = getKeyChroma(fftBuffer)

		analyseKey([fullChroma])

	}, fftIntervalTime)

}

function disconnectAnalyser() {

	try {

		if (keyAnalyser) {
			clearInterval(fftInterval)
			source.disconnect(keyAnalyser)
			keyAnalyser = undefined
		}

		if (melodyAnalyser) {
			clearInterval(tdInterval)
			source.disconnect(melodyAnalyser)
			melodyAnalyser = undefined
		}

		document.getElementById('start-button-container').style.display = 'flex'
		document.getElementById('finish-button-container').style.display = 'none'

		if (!loopback) {
			clearAudio()
		}

	} catch (err) {

		console.error(err)
		console.log('Failed to disconnect analyser.')
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

function disconnectLoopback(input) {

	try {

		source.disconnect(loopback)
		
		loopback = undefined

		const loopbackButton = document.getElementById('test-microphone-button')
		loopbackButton.value = 'Test Microphone'
		loopbackButton.className = ''

		if (!melodyAnalyser && !keyAnalyser) {
			clearAudio()
		}

	} catch (err) {

		console.error(err)
		console.log('Failed to disconnect loopback.')
		clearAudio()

	}

}

async function reconnectStreams() {

	try {

		if (!audioContext) {
			return
		}

		if (melodyAnalyser) {
			source.connect(melodyAnalyser)
		}
		
		if (keyAnalyser) {
			source.connect(keyAnalyser)
		}
		
		if (loopback) {
			source.connect(loopback)
		}

	} catch (err) {

		console.error(err)
		console.log('Failed to reconnect streams.')
		clearAudio()

	}

}





onScriptLoad()