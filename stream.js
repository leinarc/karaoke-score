// Reference 1: https://whatnoteisthis.com/
// Reference 2: https://davidtemperley.com/wp-content/uploads/2015/12/temperley-ms04.pdf

const fftSize = 8192

const analyseIntervalTime = 500

var tdBuffer
var fftBuffer

var stream
var source
var	audioContext
var analyser
var analyseInterval

var animationInterval
var animationTimeout

async function getMicAudio() {

	try {

		await clearAudio()

		audioContext = new AudioContext()

		stream = await navigator.mediaDevices.getUserMedia(
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

		connectStream()

	} catch (err) {

		console.error(err)
		alert('Failed to get mic audio.')
		await clearAudio()

	}

}

async function getStreamAudio(audioStream) {
	
	try {

		await clearAudio()

		stream = audioStream

		connectStream()

		audioContext = new AudioContext()

	} catch (err) {

		console.error(err)
		alert('Failed to get stream audio.')
		await clearAudio()

	}

}

function connectStream() {

	source = audioContext.createMediaStreamSource(stream)

	analyser = audioContext.createAnalyser()
	analyser.fftSize = fftSize;
	tdBuffer = new Float32Array(analyser.fftSize)
	fftBuffer = new Float32Array(analyser.frequencyBinCount)
	source.connect(analyser)

	analyseInterval = setInterval(analyseAudio, analyseIntervalTime)

	document.getElementById('start-button-container').style.display = 'none'
	document.getElementById('finish-button-container').style.display = 'flex'

}

async function clearAudio() {

	clearInterval(analyseInterval)
	clearInterval(animationInterval)
	clearTimeout(animationTimeout)

	document.getElementById('start-button-container').style.display = 'flex'
	document.getElementById('finish-button-container').style.display = 'none'

	document.getElementById('show-score').checked = false
	document.getElementById('effect1').checked = false
	document.getElementById('effect2').checked = false
	document.getElementById('effect3').checked = false
	document.getElementById('effect4').checked = false
	document.getElementById('effect5').checked = false
	document.getElementById('effect6').checked = false

	document.getElementById('score').innerText = ''
	document.getElementById('message').innerText = ''

	analyser?.disconnect();
	source?.disconnect();
	stream?.getTracks().forEach(t => t.stop());
	await audioContext?.close();

	analyser = undefined
	source = undefined
	stream = undefined
	audioContext = undefined

}