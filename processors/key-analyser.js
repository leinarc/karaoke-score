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

				return {
					exports,
					inputBuffer,
					outputBufferChroma,
					outputBufferPeak
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
			const processorOptions = processor.options
			
			const {
				dftSize,
				dftOverlap,
				dftChannels,
				startNote,
				noteCount,
				sampleRate, 
				keyWASM,
				safeNoteCount,
				safeBufferSize,
				cutoffs,
				maxDelay
			} = processorOptions
			
			const buffers = inputs.flat()

			const scheduledDate = Date.now()

			Promise.all(modules).then(modules => {

				if (processor.error) return

				const startDate = Date.now()

				const skipOutput = maxDelay > 0 && startDate - scheduledDate > maxDelay

				const outputs = []

				for (let i = 0; i < modules.length; i++) {

					const module = modules[i]
					const buffer = buffers[i]

					const {
						exports,
						inputBuffer,
						outputBufferChroma,
						outputBufferPeak
					} = module

					if (!buffer) continue

					inputBuffer.set(buffer)

					const outputCount = exports.process_input(dftSize, dftOverlap, noteCount, Math.min(buffer.length, safeBufferSize), skipOutput)

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

				if (maxDelay > 0 && Date.now() - startDate > maxDelay && processorOptions.dftSize > 4096) {
					console.log('Excess delay detected in key processor, halving size...')
					processorOptions.dftSize /= 2
					processorOptions.dftOverlap /= 4
					console.log('DFT size set to:', processorOptions.dftSize)
					console.log('DFT overlap set to:', processorOptions.dftOverlap)
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