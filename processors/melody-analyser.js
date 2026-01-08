class melodyAnalyserProcessor extends AudioWorkletProcessor {

	constructor(options) {

		super()

		const processor = this

		const processorOptions = options.processorOptions

		const {
			tdSize,
			tdOverlap,
			sampleRate, 
			melodyWASM,
			safeNoteCount,
			safeBufferSize
		} = processorOptions

		processor.options = processorOptions

		WebAssembly.instantiate(
			melodyWASM,
			{
				env: {
					'js_log': console.log
				}
			}
		).then(module => {

			module = module.instance.exports

			processor._module = module

			processor._inputBuffer = new Float64Array(module.memory.buffer, module.input_buffer, safeBufferSize)
			processor._outputBuffer = new Float64Array(module.memory.buffer, module.output_buffer, safeBufferSize*2)

		}).catch(err => {

			console.error(err)
			console.log('Failed to import WebAssembly melody analyser.')
			processor.error = err

			processor.port.postMessage(err)

		})

		processor._bufferSize = 0

	}

	process(inputs, outputs, parameters) {

		const error = this.error

		if (error) {
			return false
		}

		const module = this._module

		if (!module) {
			return
		}

		try {

			this._processing = true
			
			const inputBuffer = this._inputBuffer
			const outputBuffer = this._outputBuffer
			
			const {
				tdSize,
				tdOverlap,
				sampleRate, 
				melodyWASM,
				safeNoteCount,
				safeBufferSize
			} = this.options

			const buffer = inputs[0][0]

			if (!buffer) {
				return true
			}

			inputBuffer.set(buffer)

			const outputCount = module.process_input(tdSize, tdOverlap, sampleRate, Math.min(buffer.length, safeBufferSize))

			for (let i = 0; i < outputCount; i++) {
				this.port.postMessage(outputBuffer.slice(i * 2, (i + 1) * 2))
			}

			return true

		} catch (err) {

			this.error = err

			throw err

		}

	}

}

registerProcessor('melody-analyser', melodyAnalyserProcessor)