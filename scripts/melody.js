var melodyAllTimePeak = 0

function getMelodyFreq(buf) {

	// Reference 1 says something about ACF2+, idk what that is
	// Oh ok I get it now, this is detecting the frequency at which the audio wave aligns with itself
	let size = buf.length

	let peak = buf.reduce((a, b) => Math.max(a, Math.abs(b)), 0)
	let freq = -1

	if (peak > melodyAllTimePeak) {
		melodyAllTimePeak = peak
	}

	// Compute RMS
	let rms = 0

	for (let i = 0; i < size; i++) {
		let val = buf[i]
		val /= melodyAllTimePeak
		buf[i] = val
		rms += val * val
	}

	rms = Math.sqrt(rms / size)

	if (rms < 0.01) { // not enough signal
		return [freq, peak]
	}

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
			c[i] = c[i] + buf[j] * buf[j+i]
		}
	}

	const sampleRate = audioContext.sampleRate

	// Discard dip from the lowest frequency 
	let d=1
	while (c[d] > c[d+1]) {
		d++
	}

	// Get the lag with the highest correlation
	const valthres = 1

	let maxval = -1
	let maxpos = -1
	for (let i = d; i < size; i++) {
		if (c[i] > maxval && c[i] > valthres) {
			maxval = c[i]
			maxpos = i
		}
	}

	// Interpolate and get the peak
	const x1 = c[maxpos-1]
	const x2 = c[maxpos]
	const x3 = c[maxpos+1]
	const a = (x1 + x3 - 2*x2) / 2
	const b = (x3 - x1)/2

	let T0 = maxpos
	if (a) {
		T0 = T0 - b / (2*a)
	}

	freq = sampleRate / T0

	return [freq, peak]

}

onScriptLoad()