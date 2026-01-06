// Reference 1: https://whatnoteisthis.com/
// Reference 2: https://davidtemperley.com/wp-content/uploads/2015/12/temperley-ms04.pdf

const tdSize = 2048 // for td
const fftSize = 8192 // for fft

const tdIntervalTime = 20 // for td
const fftIntervalTime = 500 // for fft

var tdBuffer
var fftBuffer

var	audioContext
var stream
var source
var loopback
var tdAnalyser
var fftAnalyser

var tdInterval
var fftInterval

var analyse2RAF

var analyzing



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

	if (!audioContext) {
		await getMicAudio()
	}

	if (loopback) {

		disconnectLoopback()

	} else {

		await connectLoopback()

	}

}



async function getMicAudio() {

	if (!audioContext) {
		audioContext = new AudioContext()
	}

	stream = await navigator.mediaDevices.getUserMedia(
		{
			"audio": constraints,
		}
	)

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
		stream.getTracks().forEach(track => track.stop())

		source = undefined
		stream = undefined

	} catch (err) {

		console.error(err)
		alert('Failed to remove mic audio.')

	}

}



async function clearAudio() {

	const oldContext = audioContext;

	try {
		fftAnalyser?.disconnect()
	} catch (err) {
		console.error(err)
		console.log('Clear Audio: Failed to disconnect fft analyser.')
	}

	try {
		tdAnalyser?.disconnect()
	} catch (err) {
		console.error(err)
		console.log('Clear Audio: Failed to disconnect td analyser.')
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

	fftAnalyser = undefined
	tdAnalyser = undefined
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



function connectAnalyser() {

	try {

		tdAnalyser = audioContext.createAnalyser()
		tdAnalyser.fftSize = tdSize
		tdBuffer = new Float32Array(tdAnalyser.fftSize)
		source.connect(tdAnalyser)

		fftAnalyser = audioContext.createAnalyser()
		fftAnalyser.fftSize = fftSize
		fftBuffer = new Float32Array(fftAnalyser.frequencyBinCount)
		source.connect(fftAnalyser)

		tdInterval = setInterval(analyseMelody, tdIntervalTime)
		fftInterval = setInterval(analyseKey, fftIntervalTime)

		document.getElementById('start-button-container').style.display = 'none'
		document.getElementById('finish-button-container').style.display = 'flex'

	} catch (err) {

		console.error(err)
		console.log('Failed to connect analyser.')
		clearAudio()

	}

}

function disconnectAnalyser() {

	try {

		if (fftAnalyser) {
			clearInterval(fftInterval)
			source.disconnect(fftAnalyser)
			fftAnalyser = undefined
		}

		if (tdAnalyser) {
			clearInterval(tdInterval)
			source.disconnect(tdAnalyser)
			tdAnalyser = undefined
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

	if (!confirm('This may cause a feedback loop if you are using a speaker.\n\nDo you want to continue?')) {
		return
	}

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

		if (!tdAnalyser && !fftAnalyser) {
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

		if (tdAnalyser) {
			source.connect(tdAnalyser)
		}
		
		if (fftAnalyser) {
			source.connect(fftAnalyser)
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