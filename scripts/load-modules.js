// ---------------- Load ----------------



// Load modules
const modules = [
	import('./analysis/filter.js'),
	import('./analysis/fft.js'),
	import('./analysis/key-probabilities.js'),
	import('./analysis/key.js'),
	import('./analysis/melody.js'),
	import('./analysis/sensitivity.js')
]



// ---------------- Await ----------------



// Set module exports
try {
	for (let module of modules) {
		module = await module
		for (const exported in module) {
			window[exported] = module[exported]
		}
	}
} catch (err) {
	console.error(err)
	alert(`Failed to load modules.\n` + err)
}



onScriptLoad()