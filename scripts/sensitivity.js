// Reference 3: https://cdn.standards.iteh.ai/samples/34222/d93363dbdafa470aab734f04d091065b/ISO-226-2003.pdf

const sensitivities = getNoteSensitivities(0, safeNoteCount)

function getNoteSensitivities(startNote, noteCount) {

	let sensitivities = []

	for (let i = 0; i < noteCount; i++) {
		const note = i + startNote

		const freq = 440 * 2**((note-69)/12)

		sensitivities[note] = getFrequencySensitivity(freq)

	}

	// const max = Math.max(...sensitivities)

	// sensitivities = sensitivities.map(sensitivity => sensitivity / max)

	return sensitivities
	
}

function getFrequencySensitivity(freq) {

	const frequencies = [
		20,
		25,
		31.5,
		40,
		50,
		63,
		80,
		100,
		125,
		160,
		200,
		250,
		315,
		400,
		500,
		630,
		800,
		1000,
		1250,
		1600,
		2000,
		2500,
		3150,
		4000,
		5000,
		6300,
		8000,
		10000,
		12500 
	]

	const a = [
		0.532,
		0.506,
		0.480,
		0.455,
		0.432,
		0.409,
		0.387,
		0.367,
		0.349,
		0.330,
		0.315,
		0.301,
		0.288,
		0.276,
		0.267,
		0.259,
		0.253,
		0.250,
		0.246,
		0.244,
		0.243,
		0.243,
		0.243,
		0.242,
		0.242,
		0.245,
		0.254,
		0.271,
		0.301
	]

	const L = [
		-31.6,
		-27.2,
		-23.0,
		-19.1,
		-15.9,
		-13.0,
		-10.3,
		-8.1,
		-6.2,
		-4.5,
		-3.1,
		-2.0,
		-1.1,
		-0.4,
		0.0,
		0.3,
		0.5,
		0.0,
		-2.7,
		-4.1,
		-1.0,
		1.7,
		2.5,
		1.2,
		-2.1,
		-7.1,
		-11.2,
		-10.7,
		-3.1
	]

	const T = [
		78.5,
		68.7,
		59.5,
		51.1,
		44.0,
		37.5,
		31.5,
		26.5,
		22.1,
		17.9,
		14.4,
		11.4,
		8.6,
		6.2,
		4.4,
		3.0,
		2.2,
		2.4,
		3.5,
		1.7,
		-1.3,
		-4.2,
		-6.0,
		-5.4,
		-1.5,
		6.0,
		12.6,
		13.9,
		12.3
	]

	let p = 0
	let n = frequencies.length - 1

	while (p < frequencies.length - 2) {
		if (frequencies[p + 1] >= freq) break
		p++
	}

	while (n > 1) {
		if (frequencies[n - 1] <= freq) break
		n--
	}


	let a_f
	let L_U
	let T_f

	if (p == n) {
		a_f = a[p]
		L_U = L[p]
		T_f = T[p]
	} else {
		const gap = frequencies[n] - frequencies[p]
		const pMult = (freq - frequencies[p]) / gap
		const nMult = 1 - pMult

		a_f = a[p]*pMult + a[n]*nMult
		L_U = L[p]*pMult + L[n]*nMult
		T_f = T[p]*pMult + T[n]*nMult
	}

	const L_N = 40
	const A_f = 4.47 * 10**(-30) * (10**(0.025*L_N) - 1.15) + (0.4 * 10**((T_f+L_U)/10 - 9))**a_f
	const L_p = 10/a_f * Math.log10(A_f) - L_U + 94

	const amplitude = 10**(-L_p/20)

	return amplitude**0.25

}

onScriptLoad()