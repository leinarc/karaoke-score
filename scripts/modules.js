const modules = [
	await import('./analysis/filter.js'),
	await import('./analysis/fft.js'),
	await import('./analysis/key-probabilities.js'),
	await import('./analysis/key.js'),
	await import('./analysis/melody.js'),
	await import('./analysis/sensitivity.js')
]

for (const module of modules) {
	for (const exported in module) {
		window[exported] = module[exported]
	}
}



onScriptLoad()