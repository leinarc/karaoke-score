import { getSensitivities } from '../analysis/sensitivity.js'
import { filterFFT, createFilter } from '../analysis/filter.js'
import { getFFT, getInverseFFT } from '../analysis/fft.js'
import { getFullChroma, getChroma, getMaxChroma } from '../analysis/key.js'
import { getFrequency, getQuality, getLoudness, minMelodyFreq, maxMelodyFreq } from '../analysis/melody.js'

import analyserProcessor from './analyser.js'

export default class jsAnalyserProcessor extends analyserProcessor {

	updateFFTSize(fftSize) {
		const processor = this
		const processorOptions = processor.options
		const modules = processor._modules

		const { sampleRate } = processorOptions

		Promise.all(modules).then(modules => {
			modules.forEach(module => {
				processorOptions.fftSize = fftSize
				module.sensitivities = getSensitivities(sampleRate, fftSize)
				module.filter = createFilter(fftSize)
			})
		})
	}

	updateSampleInterval(fftSampleInterval) {
		const processor = this
		const processorOptions = processor.options
		const modules = processor._modules

		Promise.all(modules).then(modules => {
			processorOptions.fftSampleInterval = fftSampleInterval
		})
	}

	createModule() {

		const cache = []

		return {
			cache
		}

	}

	processModuleInput(processorOptions, module, buffer, skipOutput) {

		const {
			fftSize,
			fftSampleInterval,
			sampleRate,
			startNote,
			noteCount
		} = processorOptions

		const {
			cache,
			sensitivities,
			filter
		} = module

		let newLength = cache.length + buffer.length
		let newStart = 0

		const newCache = [...cache, ...buffer]

		const outputs = Object.create(null)

		while (newLength >= fftSize) {
			if (!skipOutput) {
				const input = newCache.slice(newStart, newStart + fftSize)
				processOutput(input)
			}

			newLength -= fftSampleInterval
			newStart += fftSampleInterval
		}


		
		function processOutput(input) {

			const fft = getFFT(input).map(x => (x[0]**2 + x[1]**2)**0.5).slice(0, input.length/2 + 1)

			const filteredFFT = filterFFT(fft, sensitivities, filter)
			
			const loudness = getLoudness(filteredFFT)

			const fullChroma = getFullChroma(filteredFFT.slice(0, -1), fftSize, sampleRate, startNote, noteCount)
			const chroma = getChroma(fullChroma)

			// Restore full fft
			const fullFFT = [...filteredFFT, ...filteredFFT.slice(1, -1).reverse()]

			const freq = getFrequency(sampleRate, fullFFT)
			const quality = getQuality(freq)

			if (outputs.chromas) outputs.chromas.push(chroma);
			else outputs.chromas = [chroma];

			if (outputs.frequencies) outputs.frequencies.push(freq);
			else outputs.frequencies = [freq];
		
			outputs.visualizerChroma = fullChroma

			if (outputs.quality === undefined || quality > outputs.quality) outputs.quality = quality;
			if (outputs.loudness === undefined || loudness > outputs.loudness) outputs.loudness = loudness;

		}

		module.cache = newCache.slice(newStart)

		return outputs

	}

}

registerProcessor('js-analyser', jsAnalyserProcessor)