const melodyMinPeak = 0.2

var melodyAllTimePeak = 0

function getMelodyFreq(buf) {

	// Reference 1 says something about ACF2+, idk what that is
	// Oh ok I get it now, this is detecting the frequency at which the audio wave aligns with itself
	let size = buf.length

	let freq = -1

	// Compute Peak and RMS
	let peak = buf.reduce((a, b) => Math.max(a, Math.abs(b)), 0)

	melodyAllTimePeak = peak / 128 + melodyAllTimePeak * 127 / 128;

	if (melodyAllTimePeak < melodyMinPeak) {
		melodyAllTimePeak = melodyMinPeak
	}
	
	if (melodyAllTimePeak > peak) {
		peak = melodyAllTimePeak;
	}

	let rms = 0

	if (peak <= 0) return [freq, peak]

	for (let i = 0; i < size; i++) {
		const val = buf[i]
		buf[i] /= peak
		rms += val*val
	}

	rms = rms / (peak*peak) / size

	if (rms < 0.0001) return [freq, peak] // not enough signal

	// Cut out unfinished waves at both ends of the buffer
	let r1 = 0
	let r2 = size - 1
	const thres = 0.2

	for (let i = 0; i < size / 2; i++) {
		if (Math.abs(buf[i]) < thres) {
			r1 = i
			break
		}
	}

	for (let i = 1; i < size / 2; i++) {
		if (Math.abs(buf[size - i]) < thres) {
			r2 = size - i
			break
		}
	}

	// Get correlation per lag
	buf = buf.slice(r1,r2)
	size = buf.length

	let c = new Array(size).fill(0)

	for (let i = 0; i < size; i++) {
		for (let j = 0; j < size-i; j++) {
			c[i] += buf[j] * buf[j+i]
		}
	}

	const sampleRate = audioContext.sampleRate

	// Discard slope from the low lag 
	let d=0
	while (c[d] > c[d+1]) {
		d++
	}

	// Get the lag with the highest correlation
	let maxval = -1
	let maxpos = -1
	for (let i = d; i < size; i++) {
		if (c[i] > maxval) {
			maxval = c[i]
			maxpos = i
		}
	}

	if (maxpos <= 0) return [freq, peak]

	let T0 = maxpos

	if (maxpos + 1 < size) {

		// Interpolate and get the maxima
		const x1 = c[maxpos-1]
		const x2 = c[maxpos]
		const x3 = c[maxpos+1]
		const a = (x1 + x3 - 2*x2) / 2
		const b = (x3 - x1)/2

		T0 = T0 - b / (2*a)

		if (T0 <= 0) return [freq, peak]

	}

	freq = sampleRate / T0

	return [freq, peak]

}

onScriptLoad()