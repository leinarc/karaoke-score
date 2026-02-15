import { getSensitivities } from '../analysis/sensitivity.js'
import {
	minFilterPeak,
	filterSensitivityTarget,
	filterSensitivityMultiplier,
	filterBias,
	createFilter
} from '../analysis/filter.js'
import { getFrequencyPitchClass } from '../analysis/key.js'
import { getQuality } from '../analysis/melody.js'

import analyserProcessor from './analyser.js'

export default class wasmAnalyserProcessor extends analyserProcessor {

	updateFFTSize(fftSize) {
		const processor = this
		const processorOptions = processor.options
		const modules = processor._modules

		processorOptions.fftSize = fftSize

		Promise.all(modules).then(modules => {
			modules.forEach(module => {
				module.updateFFTSize(fftSize)
			})
		})
	}

	updateSampleInterval(fftSampleInterval) {
		const processor = this
		const processorOptions = processor.options

		processorOptions.fftSampleInterval = fftSampleInterval
	}

	createModule() {
		const processor = this
		const processorOptions = processor.options
		
		const {
			maxBufferSize,
			maxNoteCount,
			maxFFTSize,
			minFFTSize,
			sampleRate,
			fftSize,
			wasmBuffer
		} = processorOptions

		return WebAssembly.instantiate(
			wasmBuffer,
			{
				env: {
					'js_log': console.log
				}
			}
		).then(wa => {

			const exports = wa.instance.exports

			const processInput = exports.process_input

			const buffer = exports.memory.buffer

			;(new Float32Array(buffer, exports.min_filter_peak, 1)).set([minFilterPeak])
			;(new Float32Array(buffer, exports.filter_sensitivity_target, 1)).set([filterSensitivityTarget])
			;(new Float32Array(buffer, exports.filter_sensitivity_multiplier, 1)).set([filterSensitivityMultiplier])
			;(new Float32Array(buffer, exports.filter_bias, 1)).set([filterBias])
			
			const filter = {
				bed: new Float32Array(buffer, exports.filter_bed, maxFFTSize),
				bedSensitivity: new Float32Array(buffer, exports.filter_bed_sensitivity, 1),
				peak: new Float32Array(buffer, exports.filter_peak, 1),
				peakSensitivity: new Float32Array(buffer, exports.filter_peak_sensitivity, 1)
			}

			const pitchClassesTable = new Uint32Array(buffer, exports.pitch_classes_table, maxFFTSize * 2)
			const pitchMultipliersTable = new Float32Array(buffer, exports.pitch_multipliers_table, maxFFTSize * 2)
			const pitchMaxMultipliersTable = new Float32Array(buffer, exports.pitch_max_multipliers_table, maxNoteCount)

			const sensitivitiesTable = new Float32Array(buffer, exports.sensitivities_table, maxFFTSize)
			
			const cosTable = new Float32Array(buffer, exports.cos_table, maxFFTSize)



			const inputBuffer = new Float32Array(buffer, exports.input_buffer, maxBufferSize)

			const outputBufferChromas          = new Float32Array(buffer, exports.output_buffer_chromas          , maxBufferSize * maxNoteCount)
			const outputBufferVisualizerChroma = new Float32Array(buffer, exports.output_buffer_visualizer_chroma, maxNoteCount)

			const outputBufferFrequencies = new Float32Array(buffer, exports.output_buffer_frequencies, maxBufferSize)
			// const outputBufferQuality     = new Float32Array(buffer, exports.output_buffer_quality    , 1)
			const outputBufferLoudness    = new Float32Array(buffer, exports.output_buffer_loudness   , 1)

			// const probe = new Float32Array(buffer, exports.real_bins, maxFFTSize)

			updateFFTSize(fftSize)

			function updateFFTSize(fftSize) {
		
				const {
					sampleRate,
					startNote,
					noteCount
				} = processorOptions

				const newPitchClassesTable = []
				const newPitchMultipliersTable = []
				const newPitchMaxMultipliersTable = (new Array(noteCount)).fill(0)
				for (let i = 0; i < fftSize; i++) {
					const freq = sampleRate * i / fftSize;
					const { class1, class2, multiplier1, multiplier2 } = getFrequencyPitchClass(freq)
					newPitchClassesTable.push(class1, class2)
					newPitchMultipliersTable.push(multiplier1, multiplier2)
					const n1 = class1 - startNote
					const n2 = class2 - startNote
					if (n1 >= 0 && n1 < noteCount) newPitchMaxMultipliersTable[n1] += multiplier1 || 0;
					if (n2 >= 0 && n2 < noteCount) newPitchMaxMultipliersTable[n2] += multiplier2 || 0;
					// if (n1 >= 0 && n1 < noteCount && !(newPitchMaxMultipliersTable[n1] > multiplier1)) newPitchMaxMultipliersTable[n1] = multiplier1 || 0;
					// if (n2 >= 0 && n2 < noteCount && !(newPitchMaxMultipliersTable[n2] > multiplier2)) newPitchMaxMultipliersTable[n2] = multiplier2 || 0;
				}
				pitchClassesTable.set(newPitchClassesTable)
				pitchMultipliersTable.set(newPitchMultipliersTable)
				pitchMaxMultipliersTable.set(newPitchMaxMultipliersTable)
				
				const newCosTable = []
				for (let i = 0; i < fftSize; i++) newCosTable.push(Math.cos(i / fftSize * 2 * Math.PI));
				cosTable.set(newCosTable)

				const newFilter = createFilter(fftSize)
				for (const property in newFilter) {
					let value = newFilter[property]

					if (!(value instanceof Array)) value = [value];

					if (value.length > 0) filter[property].set(value);
					else filter[property].fill(0);
				}

				sensitivitiesTable.set(getSensitivities(sampleRate, fftSize))
				
			}

			return {
				processInput,
				updateFFTSize,
				inputBuffer,
				outputBufferChromas,
				outputBufferVisualizerChroma,
				outputBufferFrequencies,
				// outputBufferQuality,
				outputBufferLoudness,
				// probe,
			}

		}).catch(err => {

			console.error(err)
			console.log('Failed to import WebAssembly key analyser.')
			processor.error = err

			processor.port.postMessage(err)
			
		})

	}

	processModuleInput(processorOptions, module, buffer, skipOutput) {

		const {
			maxNoteCount,
			maxBufferSize,
			maxFFTSize,
			minFFTSize,
			sampleRate,
			fftSize,
			fftSampleInterval,
			startNote,
			noteCount
		} = processorOptions

		const {
			processInput,
			inputBuffer,
			outputBufferChromas,
			outputBufferVisualizerChroma,
			outputBufferFrequencies,
			// outputBufferQuality,
			outputBufferLoudness,
			// probe,
		} = module

		inputBuffer.set(buffer)

		const bufferSize = Math.min(buffer.length, maxBufferSize)

		const outputCount = processInput(sampleRate, fftSize, fftSampleInterval, startNote, noteCount, bufferSize, skipOutput)

		if (outputCount > 0) {

			const chromas = []
			const frequencies = []

			for (let i = 0; i < outputCount; i++) {
				chromas.push(outputBufferChromas.slice(i*12, i*12 + 12))
				frequencies.push(outputBufferFrequencies.at(i))
			}

			const visualizerChroma = outputBufferVisualizerChroma.slice(0, noteCount)
			// const quality = outputBufferQuality.at(0)
			const quality = Math.max(...frequencies.map(freq => getQuality(freq)))
			const loudness = outputBufferLoudness.at(0)

			// console.log(frequencies);

			// outputBufferQuality.set([0])
			outputBufferLoudness.set([0])
			
			return {
				chromas,
				visualizerChroma,
				frequencies,
				quality,
				loudness
			}
			
		}

	}

}

registerProcessor('wasm-analyser', wasmAnalyserProcessor)