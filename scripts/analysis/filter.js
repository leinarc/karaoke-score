const noiseMaxErrorAccumulation = 0.00001
const noiseMinErrorAccumulation = -noiseMaxErrorAccumulation

export const minFilterPeak = 0.0005
export const filterSensitivityStart = 5
export const filterSensitivityTarget = 0.01
export const filterSensitivityMultiplier = 0.99

export const filterBias = 0.99

export function createFilter(fftSize) {
	return {
		bed: (new Array(fftSize)).fill(0),
		sensitivity: filterSensitivityStart,
		peak: minFilterPeak
	}
}

export function filterFFT(fft, sensitivities, filter) {

	// Convert to array
	fft = [...fft]



	// Sensitivity Filter 

	fft = fft.map((level, i) => level * sensitivities[i])



	let { sensitivity, bed, peak } = filter

	// Noise Filter

	// Update noise bed
	bed = fft.map((level, i) => {
		
		const value = bed[i]
		const target = (level + 0.01*peak) * 1.1
		
		let newValue = target*sensitivity + value*(1-sensitivity)

		// Apply bias when raising bed
		if (newValue > value) newValue = newValue*(1-filterBias) + value*(filterBias);

		return newValue

	})

	filter.bed = bed

	// Apply filter
	fft = fft.map((level, i) => Math.max(0, level - bed[i]))



	// Normalization

	// Update peak
	const max = Math.max(...fft.map(x => x || 0))

	let newPeak = max*sensitivity + peak*(1-sensitivity);

	// Apply bias when lowering peak
	if (newPeak < peak) newPeak = newPeak*(1-filterBias) + peak*filterBias;

	// Follow minimum
	if (newPeak < minFilterPeak) newPeak = minFilterPeak;

	filter.peak = newPeak

	// Follow maximum
	if (max > newPeak) newPeak = max;

	// Apply peak
	fft = fft.map(x => x / newPeak)


	
	// Update sensitivity
	if ( sensitivity > filterSensitivityTarget ) filter.sensitivity *= filterSensitivityMultiplier;


	
	// displayVisualizer(fft.slice(0,300))

	return fft

}