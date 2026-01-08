class keyAnalyserProcessor extends AudioWorkletProcessor {

	constructor(options) {

		super()

		const processor = this

		const processorOptions = options.processorOptions

		const {
			dftSize,
			dftOverlap,
			dftChannels,
			startNote,
			noteCount,
			cyclesPerDFT,
			sampleRate, 
			keyWASM,
			safeNoteCount,
			safeBufferSize,
			maxDelay
		} = processorOptions

		processor.options = processorOptions

		const modules = []

		for (let i = 0; i < dftChannels; i++) {
			modules.push(createWASMModule())
		}

		processor._modules = modules

		function createWASMModule() {

			return WebAssembly.instantiate(
				keyWASM,
				{
					env: {
						'js_log': console.log
					}
				}
			).then(wa => {
			
				const sinTable = []
				const cosTable = []			
				const cutoffs = []

				let m = dftSize - 1

				for (let f = 0; f < noteCount; f++) {
					const note = startNote + f
					const frequency = 440 * 2**((note - 69) / 12)
					const cyclesPerSample = frequency / sampleRate
					const samplesPerCycle = sampleRate / frequency

					const cutoffSamples = samplesPerCycle * cyclesPerDFT

					for(; m > cutoffSamples; m--) {
						cutoffs[m] = f
					}

					sinTable[f] = Math.sin((cyclesPerSample % 1) * 2 * Math.PI)
					cosTable[f] = Math.cos((cyclesPerSample % 1) * 2 * Math.PI)

				}

				for(; m > 0; m--) {
					cutoffs[m] = noteCount
				}

				const exports = wa.instance.exports

				;(new Float64Array(exports.memory.buffer, exports.sin_table, safeNoteCount)).set(sinTable)
				;(new Float64Array(exports.memory.buffer, exports.cos_table, safeNoteCount)).set(cosTable)
				;(new Uint16Array(exports.memory.buffer, exports.cutoffs, safeBufferSize)).set(cutoffs)

				const inputBuffer = new Float64Array(exports.memory.buffer, exports.input_buffer, safeBufferSize)
				const outputBuffer = new Float64Array(exports.memory.buffer, exports.output_buffer, noteCount)

				return {
					exports,
					inputBuffer,
					outputBuffer
				}

			}).catch(err => {

				console.error(err)
				console.log('Failed to import WebAssembly key analyser.')
				processor.error = err

				processor.port.postMessage(err)
				
			})

		}

	}

	process(inputs, outputs, parameters) {

		const processor = this

		if (processor.error) return false

		try {

			const modules = processor._modules
			
			const {
				dftSize,
				dftOverlap,
				dftChannels,
				startNote,
				noteCount,
				cyclesPerDFT,
				sampleRate, 
				keyWASM,
				safeNoteCount,
				safeBufferSize,
				cutoffs,
				maxDelay
			} = this.options
			
			const buffers = inputs.flat()

			const startDate = Date.now()

			Promise.all(modules).then(modules => {

				if (processor.error) return

				const delay = Date.now() - startDate

				if (delay > maxDelay) {
					return
				}

				const outputs = []

				for (let i = 0; i < modules.length; i++) {

					const module = modules[i]
					const buffer = buffers[i]

					const {
						exports,
						inputBuffer,
						outputBuffer
					} = module

					if (!buffer) continue

					inputBuffer.set(buffer)

					const outputBins = exports.process_input(dftSize, dftOverlap, noteCount, Math.min(buffer.length, safeBufferSize))

					if (outputBins > 0) {
						outputs.push(outputBuffer.slice(0, outputBins))
					}

				}

				if (outputs.length > 0) {
					this.port.postMessage(outputs)
				}

			}).catch(err => {

				console.error(err)
				console.log('Failed to run WebAssembly key analyser.')
				processor.error = err

				processor.port.postMessage(err)
				
			})

			return true

		} catch (err) {

			this.error = err

			throw err

		}

	}

}

registerProcessor('key-analyser', keyAnalyserProcessor)