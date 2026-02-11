import { getInverseFFT } from './fft.js'

export const minMelodyFreq = 50
export const maxMelodyFreq = 1200

export function getFrequency(sampleRate, fft) {
	
	// Compute ACF correlations from FFT
	const correlations = getInverseFFT(fft.map(x => x ** 2)).slice(0, fft.length/2).map(x => x[0])

	// Discard slope from the low lag 
	let i = 0
	while (correlations[i] > correlations[i+1]) i++;

	// Get the lag with the highest correlation
	let maxValue = -1
	let maxIndex = -1
	for (; i < correlations.length; i++) {
		if (correlations[i] > maxValue) {
			maxValue = correlations[i]
			maxIndex = i
		}
	}

	if (maxValue < 0.5) return;
	if (maxIndex <= 0) return;

	let lag = maxIndex

	if (maxIndex + 1 < correlations.length) {

		// Interpolate and get the maxima
		const x1 = correlations[maxIndex-1]
		const x2 = correlations[maxIndex]
		const x3 = correlations[maxIndex+1]
		const a = (x1 + x3 - 2*x2) / 2
		const b = (x3 - x1)/2

		lag = lag - b / (2*a)

		if (lag <= 0) return;

	}

	const freq = sampleRate / lag

	return freq

}

export function getQuality(freq) {

	if (!(freq >= minMelodyFreq && freq <= maxMelodyFreq)) return 0;

	const frac = (12 * Math.log2(freq / 440) % 1 + 1) % 1
	const quality = 1 - 4 * (1-frac) * frac

	return quality

}

export function getLoudness(fft) {

	const loudness = Math.max(...fft)

	return loudness
	
}