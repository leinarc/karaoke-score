class keyAnalyserProcessor extends AudioWorkletProcessor {

	constructor(options) {

		super()

		const processor = this

		const processorOptions = options.processorOptions

		const {
			fftSize,
			startNote,
			noteCount,
			sampleRate, 
			keyWasm,
			safeNoteCount,
			safeBufferSize
		} = processorOptions

		processor.options = processorOptions

		WebAssembly.instantiate(
			keyWasm,
			{
				env: {
					'js_log': console.log
				}
			}
		).then(module => {

			module = module.instance.exports
		
			const sinTable = []
			const cosTable = []			
			const cutoffs = []

			var m = fftSize - 1

			for (var f = 0; f < noteCount; f++) {
				const note = startNote + f
				const frequency = 440 * 2**((note - 69) / 12)
				const cyclesPerSample = frequency / sampleRate
				const samplesPerCycle = sampleRate / frequency

				const cutoffSamples = samplesPerCycle * 2

				for(; m > cutoffSamples; m--) {
					cutoffs[m] = f
				}

				sinTable[f] = Math.sin((cyclesPerSample % 1) * 2 * Math.PI)
				cosTable[f] = Math.cos((cyclesPerSample % 1) * 2 * Math.PI)

			}

			for(; m > 0; m--) {
				cutoffs[m] = noteCount
			}

			processor._module = module

			;(new Float64Array(module.memory.buffer, module.sin_table, safeNoteCount)).set(sinTable)
			;(new Float64Array(module.memory.buffer, module.cos_table, safeNoteCount)).set(cosTable)
			;(new Uint16Array(module.memory.buffer, module.cutoffs, safeBufferSize)).set(cutoffs)

			processor._inputBuffer = new Float64Array(module.memory.buffer, module.input_buffer, safeBufferSize)
			processor._outputBuffer = new Float64Array(module.memory.buffer, module.output_buffer, noteCount)

		}).catch(err => {

			console.error(err)
			console.log('Failed to import WebAssembly key analyser.')
			processor.error = err
			
		})

	}

	async process(inputs, outputs, parameters) {

		const module = this._module

		if (!module) {
			return
		}

		this._processing = true
		
		const inputBuffer = this._inputBuffer
		const outputBuffer = this._outputBuffer
		const {
			fftSize,
			fftOverlap,
			startNote,
			noteCount,
			sampleRate, 
			keyWasm,
			safeNoteCount,
			safeBufferSize,
			cutoffs
		} = this.options

		const buffer = inputs[0][0]

		//let c = 0
		//for (const input of inputs) {
			//for (const buffer of input) {
				inputBuffer.set(buffer)

				const outputBins = await module.process_input(fftSize, fftOverlap, noteCount, Math.min(buffer.length, safeBufferSize))

				if (outputBins > 0) {
					this.port.postMessage(outputBuffer.slice(0, outputBins))
				}
				//c++
			//}
 		//}

		return !this.err

	}

}

registerProcessor('key-analyser', keyAnalyserProcessor,)