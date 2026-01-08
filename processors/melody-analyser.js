class melodyAnalyserProcessor extends AudioWorkletProcessor {

	constructor(options) {

		super()

		const processor = this

		const processorOptions = options.processorOptions

		const {
			tdSize,
			tdOverlap,
			tdChannels,
			sampleRate, 
			melodyWASM,
			safeNoteCount,
			safeBufferSize,
			maxDelay
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
				const inputBuffer = new Float64Array(exports.memory.buffer, exports.input_buffer, safeBufferSize)
				const outputBuffer = new Float64Array(exports.memory.buffer, exports.output_buffer, safeBufferSize*2)
				const allTimePeak = new Float64Array(exports.memory.buffer, exports.all_time_peak, 1)

				return {
					exports,
					inputBuffer,
					outputBuffer,
					allTimePeak
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
			
			const {
				tdSize,
				tdOverlap,
				tdChannels,
				sampleRate, 
				melodyWASM,
				safeNoteCount,
				safeBufferSize,
				maxDelay
			} = processor.options

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
						outputBuffer,
						allTimePeak
					} = module

					if (!buffer) {
						allTimePeak[0] = 0 // I may regret relying on this condition xd
						continue
					}
					
					inputBuffer.set(buffer)

					const outputCount = exports.process_input(tdSize, tdOverlap, sampleRate, Math.min(buffer.length, safeBufferSize))

					for (let i = 0; i < outputCount; i++) {
						outputs.push(outputBuffer.slice(i*2, 2 + i*2))
					}

				}

				if (outputs.length > 0) {
					this.port.postMessage(outputs)
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