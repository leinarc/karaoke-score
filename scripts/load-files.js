// ---------------- Load ----------------



const promises = Object.create(null)



// Load GIF files
const gifs = {}

for (const rating in gifCount) {
	gifs[rating] = []
	const count = gifCount[rating]
	for (let i = 0; i < count; i++) {
		gifs[rating][i] = loadGIF('gifs/' + rating + (i+1) + '.gif')
	}
}

promises.gifs = gifs



// Load processors
promises.processorJS = loadProcessorJS('scripts/processors/analyser.js')
promises.jsProcessorJS = loadProcessorJS('scripts/processors/js-analyser.js')
promises.wasmProcessorJS = loadProcessorJS('scripts/processors/wasm-analyser.js')
promises.wasmProcessorWASM = loadProcessorWASM('scripts/processors/wasm-analyser.wasm')



// ---------------- Await ----------------



// Set GIFs
try {
	for (const rating in gifCount) {
		const count = gifCount[rating]
		for (let i = 1; i <= count; i++) {
			gifs[rating][i] = await gifs[rating][i]
		}
	}
} catch (err) {
	console.error(err)
	alert(`Failed to load GIFs.\n` + err)
}



// Set global variables
try {
	for (const variable in promises) {
		window[variable] = await promises[variable]
	}
} catch (err) {
	console.error(err)
	alert(`Failed to load files.\n` + err)
}



onScriptLoad()