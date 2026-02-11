var processorJS
var jsProcessorJS
var wasmProcessorJS
var wasmProcessorWASM

async function loadProcessorWASM(url) {
	const response = await fetch(url)
	const buffer = await response.arrayBuffer()

	return buffer
}

// Preloaded js files are not used since addModule does not accept url blob, and reader url breaks imports
// However, it still gets cached as long as it's fetched which is weird
function loadProcessorJS(url) {
	return new Promise(async (resolve, reject) => {
		try {
			const response = await fetch(url)
			const text = await response.text()
			const blob = new Blob([text], { type: 'application/javascript; charset=utf-8' })
			
			resolve(URL.createObjectURL(blob))

			// const reader = new FileReader();
			// reader.readAsDataURL(blob);

			// reader.onloadend = () => {
			// 	resolve(reader.result);
			// }
		} catch (err) {
			reject(err)
		}
	})
}

async function createWorkletAnalyser(type) {

	try {

		const sampleRate = audioContext.sampleRate

		const processorOptions = {
			maxNoteCount,
			maxBufferSize,
			maxFFTSize,
			minFFTSize,
			fftSize,
			fftSampleInterval,
			fftChannels,
			startNote,
			noteCount,
			sampleRate
		}

		if (type == 'wasm') {
			await audioContext.audioWorklet.addModule('scripts/processors/wasm-analyser.js')
			processorOptions.wasmBuffer = wasmProcessorWASM
		} else {
			type = 'js'
			await audioContext.audioWorklet.addModule('scripts/processors/js-analyser.js')
		}

		analyser = new AudioWorkletNode(
			audioContext,
			type + '-analyser',
			{
				numberOfInputs: 1,
				numberOfOutputs: 0,
				processorOptions
			}
		)

		analyser.onprocessorerror = onWorkletAnalyserError

		analyser.port.onmessage = (message) => {

			if (!analyser) {
				return
			}

			const data = message.data

			if (data instanceof Error) {
				onWorkletAnalyserError(data)
				return
			}

			if (data.outputs) {

				const {
					chromas,
					visualizerChroma,
					frequencies,
					quality,
					loudness
				} = data.outputs

				if (chromas !== undefined) analyseKey(chromas);
				if (frequencies !== undefined) analyseMelody(frequencies);

				if (visualizerChroma !== undefined) displayVisualizer(visualizerChroma)
				if (quality !== undefined) displayQuality(quality)
				if (loudness !== undefined) displayLoudness(loudness)

			}

			if (data.func) {
				data.args ? window[data.func](...data.args) : window[data.func]()
			}

		}

	} catch (err) {

		onWorkletAnalyserError(err)	

	}


	
	async function onWorkletAnalyserError(err) {

		console.error(err)

		source.disconnect(analyser)

		const analyserName = analyserNames[analyserType]

		if (analyserName != "Auto") {
			alert('Analyser failed.\n' + err)
		}

		if (type === 'wasm') {
			
			console.log('Processor for WASM worklet analyser failed.')
			console.log('Falling back to JS worklet analyser...')

			await createWorkletAnalyser()

		} else {

			console.log('Processor for JS worklet analyser failed.')
			console.log('Falling back to native analyser...')

			createNativeAnalyser()

		}

		source.connect(analyser)

	}

}



onScriptLoad()