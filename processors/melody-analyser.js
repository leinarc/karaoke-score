class melodyAnalyserProcessor extends AudioWorkletProcessor {

	constructor(options) {

		super()

		const processor = this

		const processorOptions = options.processorOptions

		const {
			tdSize,
			tdSampleInterval,
			tdChannels,
			sampleRate, 
			melodyWASM,
			safeNoteCount,
			safeBufferSize
		} = processorOptions

		processorOptions.origTDSize = tdSize
		processorOptions.origTDSampleInterval = tdSampleInterval

		processor.options = processorOptions

		const modules = []

		for (let i = 0; i < tdChannels; i++) {
			modules.push(createWASMModule())
		}

		processor._modules = modules

		function createWASMModule() {

			return WebAssembly.instantiate(
				melodyWASM,
				{
					env: {
						'js_log': console.log
					}
				}
			).then(wa => {

				const exports = wa.instance.exports
				const buffer = exports.memory.buffer

				const inputBuffer = new Float64Array(buffer, exports.input_buffer, safeBufferSize)
				const outputBufferFrequency = new Float64Array(buffer, exports.output_buffer_frequency, safeBufferSize)
				const outputBufferLoudness = new Float64Array(buffer, exports.output_buffer_loudness, safeBufferSize)

				return {
					exports,
					inputBuffer,
					outputBufferFrequency,
					outputBufferLoudness
				}

			}).catch(err => {

				console.error(err)
				console.log('Failed to import WebAssembly melody analyser.')
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

			const buffers = inputs.flat()

			const scheduledDate = Date.now()

			Promise.all(modules).then(modules => {
			
				let {
					tdSize,
					tdSampleInterval,
					origTDSize,
					origTDSampleInterval,
					tdChannels,
					sampleRate, 
					melodyWASM,
					safeNoteCount,
					safeBufferSize
				} = processorOptions

				if (processor.error) return

				const maxDelay = tdSampleInterval / sampleRate * 1000

				const startDate = Date.now()

				const skipOutput = maxDelay > 0 && startDate - scheduledDate > maxDelay

				const outputs = []

				for (let i = 0; i < modules.length; i++) {

					const module = modules[i]
					const buffer = buffers[i]

					const {
						exports,
						inputBuffer,
						outputBufferFrequency,
						outputBufferLoudness
					} = module

					if (!buffer) continue
					
					inputBuffer.set(buffer)

					const outputCount = exports.process_input(tdSize, tdSampleInterval, sampleRate, buffer.length, skipOutput)

					if (outputCount > 0) {

						const frames = []

						for (let i = 0; i < outputCount; i++) {
							frames.push([outputBufferFrequency.at(i), outputBufferLoudness.at(i)])
						}

						outputs.push(frames)
						
					}

				}

				if (outputs.length > 0) {
					this.port.postMessage({outputs})
				}

				if (Date.now() - startDate > maxDelay) {

					console.log('Excess delay detected in melody processor, attempting to change settings...')

					if (tdSize > 512) {

						tdSize = tdSize / 2
						processorOptions.tdSize = tdSize
						console.log('TD size set to:', tdSize)

					} else if (tdSampleInterval < 32768) {

						tdSize = origTDSize
						processorOptions.tdSize = tdSize
						console.log('TD size set to:', tdSize)

						tdSampleInterval = tdSampleInterval * 2
						processorOptions.tdSampleInterval = tdSampleInterval
						console.log('TD interval set to:', tdSampleInterval)

						this.port.postMessage({
							func: "setMelodyInterval",
							args: [tdSampleInterval / sampleRate]
						})

					}

				}

			}).catch( err => {

				console.error(err)
				console.log('Failed to run WebAssembly melody analyser.')
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

registerProcessor('melody-analyser', melodyAnalyserProcessor)