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
var tdAnalyser
var fftAnalyser

var tdInterval
var fftInterval

var analyse2RAF

if (!window.requestAnimationFrame) {
	window.requestAnimationFrame = window.webkitRequestAnimationFrame;
}

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

		audioContext = new AudioContext()

		stream = audioStream

		connectStream()

	} catch (err) {

		console.error(err)
		alert('Failed to get stream audio.')
		await clearAudio()

	}

}

function connectStream() {

	source = audioContext.createMediaStreamSource(stream)

	tdAnalyser = audioContext.createAnalyser()
	tdAnalyser.fftSize = tdSize;
	tdBuffer = new Float32Array(tdAnalyser.fftSize)
	source.connect(tdAnalyser)

	fftAnalyser = audioContext.createAnalyser()
	fftAnalyser.fftSize = fftSize;
	fftBuffer = new Float32Array(fftAnalyser.frequencyBinCount)
	source.connect(fftAnalyser)

	tdInterval = setInterval(analyseMelody, tdIntervalTime)
	fftInterval = setInterval(analyseKey, fftIntervalTime)

	document.getElementById('start-button-container').style.display = 'none'
	document.getElementById('finish-button-container').style.display = 'flex'
		
	stopEndAnimation()

}

async function clearAudio() {

	clearInterval(fftInterval)
	clearInterval(tdInterval)

	document.getElementById('start-button-container').style.display = 'flex'
	document.getElementById('finish-button-container').style.display = 'none'

	fftAnalyser?.disconnect();
	tdAnalyser?.disconnect();
	source?.disconnect();
	stream?.getTracks().forEach(t => t.stop());
	await audioContext?.close();

	fftAnalyser = undefined
	tdAnalyser = undefined
	source = undefined
	stream = undefined
	audioContext = undefined

}