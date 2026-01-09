class melodyAnalyserProcessor extends AudioWorkletProcessor {

	constructor(options) {

		super()

		const processor = this

		const processorOptions = options.processorOptions

		const {
			tdSize,
			tdProcessInterval,
			tdChannels,
			sampleRate, 
			melodyWASM,
			safeNoteCount,
			safeBufferSize,
			tdMaxDelay
		} = processorOptions

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
			
				const {
					tdSize,
					tdProcessInterval,
					tdChannels,
					sampleRate, 
					melodyWASM,
					safeNoteCount,
					safeBufferSize,
					tdMaxDelay
				} = processorOptions

				if (processor.error) return

				const startDate = Date.now()

				const skipOutput = tdMaxDelay > 0 && startDate - scheduledDate > tdMaxDelay

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

					const outputCount = exports.process_input(tdSize, tdProcessInterval, sampleRate, buffer.length, skipOutput)

					if (outputCount > 0) {

						const frames = []

						for (let i = 0; i < outputCount; i++) {
							frames.push([outputBufferFrequency.at(i), outputBufferLoudness.at(i)])
						}

						outputs.push(frames)
						
					}

				}

				if (outputs.length > 0) {
					this.port.postMessage(outputs)
				}

				if (tdMaxDelay > 0 && Date.now() - startDate > tdMaxDelay && processorOptions.tdSize > tdProcessInterval) {
					console.log('Excess delay detected in melody processor, halving size...')
					processorOptions.tdSize /= 2
					console.log('TD size set to:', processorOptions.tdSize)
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