var fftBuffer

var filter

async function createNativeAnalyser() {

	analyser = audioContext.createAnalyser()
	analyser.fftSize = fftSize
	fftBuffer = new Float32Array(analyser.frequencyBinCount)

	sensitivities = getSensitivities(audioContext.sampleRate, fftSize)

	filter = createFilter(fftSize)

	setNativeAnalyserInterval()

}

function setNativeAnalyserInterval() {

	const currentAnalyser = analyser

	clearInterval(analyserInterval)
	const currentAnalyserInterval = setInterval(processNativeAnalyserData, fftSampleInterval / audioContext.sampleRate)
	analyserInterval = currentAnalyserInterval

	function processNativeAnalyserData() {

		if (currentAnalyser !== analyser) {
			clearInterval(currentAnalyserInterval)
			return
		}

		try {

			const sampleRate = audioContext.sampleRate

			const maxDelay = fftSampleInterval / sampleRate * 1000 - 1

			const startDate = Date.now()



			analyser.getFloatFrequencyData(fftBuffer)

			// Convert from dB to linear
			const fft = [...fftBuffer].map(db => Number.isFinite(db) ? 10**(db/20) : 0)

			const filteredFFT = filterFFT(fft, sensitivities, filter)

			const loudness = getLoudness(filteredFFT)

			const fullChroma = getFullChroma(filteredFFT, fftSize, sampleRate, startNote, noteCount)
			const chroma = getChroma(fullChroma)
			const visualizerChroma = fullChroma

			// Restore full fft
			const fullFFT = [...filteredFFT, 0, ...filteredFFT.slice(1).reverse()]

			const freq = getFrequency(sampleRate, fullFFT)
			const quality = freq >= minMelodyFreq && freq <= maxMelodyFreq ? getQuality(freq) : 0

			analyseKey([chroma])
			analyseMelody([freq])

			displayVisualizer(visualizerChroma)
			displayQuality(quality)
			displayLoudness(loudness)



			const endDate = Date.now()

			if (endDate - startDate > maxDelay) {

				console.log('Excess delay detected in native analyser, attempting to change settings...')

				const oldSize = fftSize

				if (fftSize > minFFTSize) {

					const size = fftSize / 2
					setFFTSize(size)
					console.log('FFT size set to:', size)

					connectAnalyser()

				} else {

					const size = maxFFTSize
					setFFTSize(size)

					const sampleInterval = fftSampleInterval + maxBufferSize
					setFFTSampleInterval(sampleInterval)

					if (oldSize !== size) {
						connectAnalyser()
						console.log('FFT size set to:', size)
					} else {
						setNativeAnalyserInterval()
					}
					console.log('FFT interval set to:', sampleInterval)

				}

			}

		} catch (err) {

			console.error(err)
			alert('Analyser failed.\n' + err)
			disconnectAnalyser()

		}

	}
}

onScriptLoad()