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
				// const maxValuesSqr = []
				// const cutoffs = []
				// const maxValueSqr = (dftSize / 2) ** 2

				for (let f = 0; f < noteCount; f++) {
					const note = startNote + f
					const frequency = 440 * 2**((note - 69) / 12)
					const cyclesPerSample = frequency / sampleRate
					// const samplesPerCycle = sampleRate / frequency
					// const maxValue = samplesPerCycle / 2
					// const maxValueSqr = maxValue**2

					sinTable[f] = Math.sin((cyclesPerSample % 1) * 2 * Math.PI)
					cosTable[f] = Math.cos((cyclesPerSample % 1) * 2 * Math.PI)
					
					// maxValuesSqr[f] = maxValueSqr

					// for(; m > cutoffSamples; m--) {
					// 	cutoffs[m] = f
					// }

				}

				// for(; m > 0; m--) {
				// 	cutoffs[m] = noteCount
				// }

				const exports = wa.instance.exports
				const buffer = exports.memory.buffer

				;(new Float64Array(buffer, exports.sin_table, safeNoteCount)).set(sinTable)
				;(new Float64Array(buffer, exports.cos_table, safeNoteCount)).set(cosTable)
				// ;(new Float64Array(buffer, exports.max_values_sqr, safeNoteCount)).set(maxValuesSqr)
				// ;(new Uint32Array(buffer, exports.cutoffs, safeNoteCount)).set(cutoffs)
				// ;(new Float64Array(buffer, exports.max_value_sqr, 1)).set([maxValueSqr])

				const inputBuffer = new Float64Array(buffer, exports.input_buffer, safeBufferSize)
				const outputBufferChroma = new Float64Array(buffer, exports.output_buffer_chroma, safeBufferSize * safeNoteCount)
				const outputBufferPeak = new Float64Array(buffer, exports.output_buffer_peak, safeBufferSize)
				const allTimePeak = new Float64Array(buffer, exports.all_time_peak, 1)

				return {
					exports,
					inputBuffer,
					outputBufferChroma,
					outputBufferPeak,
					allTimePeak
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

				if (maxDelay > 0 && Date.now() - startDate > maxDelay) {
					return
				}

				const outputs = []

				for (let i = 0; i < modules.length; i++) {

					const module = modules[i]
					const buffer = buffers[i]

					const {
						exports,
						inputBuffer,
						outputBufferChroma,
						outputBufferPeak,
						allTimePeak
					} = module

					if (!buffer) {
						allTimePeak[0] = 0 // I may regret relying on this condition xd
						continue
					}

					inputBuffer.set(buffer)

					const outputCount = exports.process_input(dftSize, dftOverlap, noteCount, Math.min(buffer.length, safeBufferSize))

					if (outputCount > 0) {

						const frames = []

						for (let i = 0; i < outputCount; i++) {
							frames.push([outputBufferChroma.slice(i*noteCount, i*noteCount + noteCount), outputBufferPeak.at(i)])
						}

						outputs.push(frames)
						
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