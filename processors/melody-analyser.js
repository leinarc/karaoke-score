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
			safeBufferSize
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
				safeBufferSize
			} = processor.options

			const buffers = inputs.flat()

			for (let i = 0; i < modules.length; i++) {

				const module = modules[i]
				const buffer = buffers[i]

				module.then(module => {

					if (processor.error) return

					const {
						exports,
						inputBuffer,
						outputBuffer,
						allTimePeak
					} = module

					if (!buffer) {
						allTimePeak[0] = 0 // I may regret relying on this condition xd
						return
					}
					
					inputBuffer.set(buffer)

					const outputCount = exports.process_input(tdSize, tdOverlap, sampleRate, Math.min(buffer.length, safeBufferSize))

					for (let i = 0; i < outputCount; i++) {
						this.port.postMessage(outputBuffer.slice(i*2, 2 + i*2))
					}

				}).catch(err => {

					console.error(err)
					console.log('Failed to run WebAssembly melody analyser.')
					processor.error = err

					processor.port.postMessage(err)
					
				})

			}

			return true

		} catch (err) {

			this.error = err

			throw err

		}

	}

}

registerProcessor('melody-analyser', melodyAnalyserProcessor)