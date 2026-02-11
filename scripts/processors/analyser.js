import { getSensitivities } from '../analysis/sensitivity.js'
import { createFilter } from '../analysis/filter.js'
import { getMaxChroma } from '../analysis/key.js'

export default class analyserProcessor extends AudioWorkletProcessor {

	constructor(options, ...args) {

		super(...args)

		const processor = this

		const processorOptions = options.processorOptions
		processor.options = processorOptions

		const {
			fftSize,
			fftSampleInterval,
			fftChannels
		} = processorOptions

		const modules = []
		processor._modules = modules

		for (let i = 0; i < fftChannels; i++) {
			modules.push(processor.createModule())
		}

		processor.updateFFTSize?.(fftSize)
		processor.updateSampleInterval?.(fftSampleInterval)

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
					maxNoteCount,
					maxBufferSize,
					maxFFTSize,
					minFFTSize,
					fftSize,
					fftSampleInterval,
					fftChannels,
					startNote,
					noteCount,
					sampleRate,
					lastSettingChangeDate
				} = processorOptions

				if (processor.error) return

				const maxDelay = fftSampleInterval / sampleRate * 1000 * 2 - 1

				const startDate = Date.now()

				const outputs = Object.create(null)

				const skipOutput = maxDelay > 0 && startDate - scheduledDate > maxDelay
				// const skipOutput = false

				let hasOutput = false

				for (let i = 0; i < modules.length; i++) {

					const module = modules[i]
					const buffer = buffers[i]

					if (!buffer) continue

					const moduleOutputs = processor.processModuleInput(processorOptions, module, buffer, skipOutput)

					if (moduleOutputs) {
						for (const output in moduleOutputs) {
							if (outputs[output]) {
								outputs[output].push(moduleOutputs[output])
							} else {
								outputs[output] = [moduleOutputs[output]]
							}
							
							hasOutput = true
						}
					}

				}

				if (outputs.chromas !== undefined) outputs.chromas = outputs.chromas.flat()
				if (outputs.visualizerChroma !== undefined) outputs.visualizerChroma = getMaxChroma(outputs.visualizerChroma)

				if (outputs.frequencies !== undefined) outputs.frequencies = outputs.frequencies.flat()
				if (outputs.quality !== undefined) outputs.quality = Math.max(...outputs.quality.map(x => x || 0))
				if (outputs.loudness !== undefined) outputs.loudness = Math.max(...outputs.loudness.map(x => x || 0))

				if (hasOutput) this.port.postMessage({ outputs })

				const endDate = Date.now()

				if (!skipOutput && (lastSettingChangeDate === undefined || endDate - lastSettingChangeDate > 1000) && endDate - startDate > maxDelay) {

					console.log('Excess delay detected in worklet processor, attempting to change settings...')

					const oldSize = fftSize

					if (fftSize > minFFTSize) {

						const size = fftSize / 2
						console.log('FFT size set to:', size)

						processor.updateFFTSize?.(size)
						this.port.postMessage({func: "setFFTSize", args: [size]})

					} else if (fftSampleInterval < maxFFTSize) {

						const size = maxFFTSize
						console.log('FFT size set to:', size)

						const sampleInterval = fftSampleInterval + maxBufferSize
						console.log('FFT interval set to:', sampleInterval)

						if (oldSize !== size) {
							processor.updateFFTSize?.(size)
							this.port.postMessage({func: "setFFTSize", args: [size]})
						}

						processor.updateSampleInterval?.(sampleInterval)
						this.port.postMessage({func: "setFFTSampleInterval", args: [sampleInterval]})

					}

					processorOptions.lastSettingChangeDate = endDate

				}

			}).catch(err => {

				console.error(err)
				console.log('Failed to run worklet analyser.')
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