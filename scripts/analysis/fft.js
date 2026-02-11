export function getFFT(input, sinSign) {

	const fftReal = []
	const fftImag = []

	// Initialize bins in reverse bit order
    let maxAdder = 1
    let max = (input.length - 1) >> 1

    while(maxAdder <= max) maxAdder <<= 1
    
    let iRev = 0
    let adder = maxAdder

    for (let i = 0; i < input.length; i++) {

		const val = input[iRev]

		if (val instanceof Array) {
			fftReal[i] = val[0]
			fftImag[i] = val[1]
		} else {
			fftReal[i] = val
			fftImag[i] = 0
		}
            
        while (iRev & adder) {
        	iRev ^= adder
        	adder >>= 1
        }

        iRev ^= adder
        adder = maxAdder
        
    }
	
	const fftSize = input.length
	const halfFFTSize = fftSize / 2
	const quarterFFTSize = fftSize / 4

	for (let halfBlockSize = 1; halfBlockSize <= halfFFTSize; halfBlockSize <<= 1) {

		const blockSize = halfBlockSize << 1

		for (let blockStart = 0; blockStart < fftSize; blockStart += blockSize) {

			for (let binIndex = 0; binIndex < halfBlockSize; binIndex++) {

				const i = blockStart + binIndex
				const j = i + halfBlockSize

				const evenReal = fftReal[i]
				const evenImag = fftImag[i]

				const oddReal = fftReal[j]
				const oddImag = fftImag[j]

				const deltaRadian = 2*Math.PI * binIndex / blockSize 

				const twiddleReal = Math.cos(deltaRadian)
				const twiddleImag = Math.sin(deltaRadian) * (sinSign || -1)

				const twiddleOddReal = twiddleReal*oddReal - twiddleImag*oddImag
				const twiddleOddImag = twiddleReal*oddImag + twiddleImag*oddReal

				fftReal[i] = evenReal + twiddleOddReal
				fftImag[i] = evenImag + twiddleOddImag

				fftReal[j] = evenReal - twiddleOddReal
				fftImag[j] = evenImag - twiddleOddImag

			}

		}

	}
	
	return fftReal.map((x, i) => [x, fftImag[i]])

}

export function getInverseFFT(fft) {

	// // Since given fft buffer is only half (i think)  
	// fft = [...fft, ...fft.slice(1, -1).reverse(),0,0]

	const ifft = getFFT(fft, 1) // .map(a => a.map(x => x / fft.length))

	return ifft

}