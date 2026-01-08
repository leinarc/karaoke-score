class keyAnalyserProcessor extends AudioWorkletProcessor {

	constructor(options) {

		super()

		const processor = this

		const processorOptions = options.processorOptions

		const {
			dftSize,
			dftOverlap,
			startNote,
			noteCount,
			sampleRate, 
			keyWASM,
			safeNoteCount,
			safeBufferSize
		} = processorOptions

		processor.options = processorOptions

		WebAssembly.instantiate(
			keyWASM,
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

			let m = dftSize - 1

			for (let f = 0; f < noteCount; f++) {
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

			processor.port.postMessage(err)
			
		})

	}

	process(inputs, outputs, parameters) {

		const error = this.error

		if (error) {
			return false
		}

		const module = this._module

		if (!module) {
			return true
		}

		try {

			this._processing = true
			
			const inputBuffer = this._inputBuffer
			const outputBuffer = this._outputBuffer
			const {
				dftSize,
				dftOverlap,
				startNote,
				noteCount,
				sampleRate, 
				keyWASM,
				safeNoteCount,
				safeBufferSize,
				cutoffs
			} = this.options

			const buffer = inputs[0][0]

			inputBuffer.set(buffer)

			const outputBins = module.process_input(dftSize, dftOverlap, noteCount, Math.min(buffer.length, safeBufferSize))

			if (outputBins > 0) {
				this.port.postMessage(outputBuffer.slice(0, outputBins))
			}

			return true

		} catch (err) {

			this.error = err

			throw err

		}

	}

}

registerProcessor('key-analyser', keyAnalyserProcessor)