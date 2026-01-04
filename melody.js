const minVocalFreq = 50
const maxVocalFreq = 800

function getMelodyFreq(buf) {

	// Reference 1 says something about ACF2+, idk what that is
	// Oh ok I get it now, this is detecting the frequency at which the audio wave aligns with itself
	var size = buf.length

	displayLoudness(buf.reduce((a, b) => Math.max(a, Math.abs(b)), 0))

	// Compute RMS
	var rms = 0

	for (var i = 0; i < size; i++) {
		const val = buf[i]
		rms += val * val
	}

	rms = Math.sqrt(rms / size);

	if (rms < 0.01) { // not enough signal
		displayQuality(0)
		return -1
	}

	// Reduce buffer to a smaller length
	var r1 = 0
	var r2 = size - 1
	const thres = 0.2

	for (var i = 0; i < size / 2; i++) {
		if (Math.abs(buf[i]) < thres) {
			r1 = i
			break
		}
	}

	for (var i = 1; i < size / 2; i++) {
		if (Math.abs(buf[size - i]) < thres) {
			r2 = size - i
			break
		}
	}

	// Get correlation per lag
	buf = buf.slice(r1,r2)
	size = buf.length

	var c = new Array(size).fill(0);
	for (var i = 0; i < size; i++) {
		for (var j = 0; j < size-i; j++) {
			c[i] = c[i] + buf[j] * buf[j+i]
		}
	}

	const sampleRate = audioContext.sampleRate

	// Discard dip from the lowest frequency 
	var d=1
	while (c[d] > c[d+1]) {
		d++
	}

	// Get the lag with the highest correlation
	const valthres = 1

	var maxval = -1
	var maxpos = -1
	for (var i = d; i < size; i++) {
		const freq = sampleRate / i
		
		// Limit to vocal range
		// if (freq < minVocalFreq/2) { break }
		// if (freq > maxVocalFreq*2) { continue }

		if (c[i] > maxval && c[i] > valthres) {
			maxval = c[i]
			maxpos = i
		}
	}

	// Interpolate and get the peak
	var T0 = maxpos;

	const x1 = c[T0-1]
	const x2 = c[T0]
	const x3 = c[T0+1]
	const a = (x1 + x3 - 2*x2) / 2
	const b = (x3 - x1)/2
	if (a) {
		T0 = T0 - b / (2*a)
	}

	// Bad frequency
	if (T0 <= 0) {
		displayQuality(0)
		return -1
	}

	const freq = sampleRate / T0

	const frac = (12 * Math.log2(freq / 440) % 1 + 1) % 1

	const quality = 1 - 4 * (1-frac) * frac

	console.log(freq)
	console.log(frac)
	console.log(quality)

	displayQuality(quality)

	return freq

}