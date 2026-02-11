#define max_note_count 128
#define max_buffer_size 128 // greater than or equal to (input)buffer_size
#define max_fft_size 32768 // greater than or equal to (input)buffer_size and fft_size
#define min_fft_size 4096 // greater than or equal to (input)buffer_size and fft_size

double min_peak = 0.0005;

__attribute__((import_module("env")))
__attribute__((import_name("js_log")))
void js_log(double);

// Filter constants
__attribute__((used))
double min_filter_peak = 0;
__attribute__((used))
double filter_sensitivity_target = 0;
__attribute__((used))
double filter_sensitivity_multiplier = 0;
__attribute__((used))
double filter_bias = 0;

// Filter data
__attribute__((used))
double filter_bed[max_fft_size] = {0};
__attribute__((used))
double filter_sensitivity = 0;
__attribute__((used))
double filter_peak = 0;

// Pitch Classes Table (fft bin -> [class_1, class_2])
__attribute__((used))
unsigned int pitch_classes_table[max_fft_size][2] = {0};

// Pitch Multipliers Table (fft bin -> [multiplier_1, multiplier_2])
__attribute__((used))
double pitch_multipliers_table[max_fft_size][2] = {0};

// Total Multipliers Table (note -> total_multiplier)
__attribute__((used))
double total_multipliers_table[max_note_count] = {0};


// Sensitivities Table
__attribute__((used))
double sensitivities_table[max_fft_size] = {0};

// Cosine table
__attribute__((used))
double cos_table[max_fft_size] = {0};

// Input buffer
__attribute__((used))
double input_buffer[max_buffer_size] = {0};

// Output buffers
__attribute__((used))
double output_buffer_chromas[max_buffer_size][12] = {0};
__attribute__((used))
double output_buffer_visualizer_chroma[max_note_count] = {0};
__attribute__((used))
double output_buffer_frequencies[max_buffer_size] = {0};
// __attribute__((used))
// double output_buffer_quality = 0;
__attribute__((used))
double output_buffer_loudness = 0;



// FFT data
double real_bins[max_fft_size] = {0};
double imag_bins[max_fft_size] = {0};
double magnitudes[max_fft_size] = {0};



// Input data
double cache_buffer[max_fft_size] = {0};
unsigned long next_cache_index = 0;
unsigned long cache_index = 0;
long progress = 0;



// Chroma data
double filtered_full_chroma[max_note_count] = {0};



void reverse_bit_order (unsigned long size, void (*executor) (unsigned long, unsigned long)) {
	
	// Reverse bits: i and i_rev

    unsigned long max_adder = 1;
    unsigned long max = (size - 1) >> 1;

    while(max_adder <= max) max_adder <<= 1;
    
    unsigned long i_rev = 0;
    unsigned long adder = max_adder;

    for (unsigned long i = 0; i < size; i++) {

		(*executor)(i, i_rev);
            
        while (i_rev & adder) {
        	i_rev ^= adder;
        	adder >>= 1;
        }

        i_rev ^= adder;
        adder = max_adder;
        
    }

	return;

}



void cache_to_bin (unsigned long i, unsigned long i_rev) {

	real_bins[i] = cache_buffer[(cache_index + i_rev) % max_fft_size];
	imag_bins[i] = 0;

	return;

}



void magnitudes_to_bin (unsigned long i, unsigned long i_rev) {

	real_bins[i] = magnitudes[i_rev];
	imag_bins[i] = 0;

	return;

}



void fft (unsigned long fft_size, unsigned long radian_scale, int sin_sign) {

	unsigned long half_fft_size = fft_size/2;
	unsigned long quarter_fft_size = fft_size/4;

	for (unsigned long half_block_size = 1; half_block_size <= half_fft_size; half_block_size <<= 1) {

		unsigned long block_size = half_block_size << 1;

		for (unsigned long block_start = 0; block_start < fft_size; block_start += block_size) {

			for (unsigned long bin_index = 0; bin_index < half_block_size; bin_index++) {

				unsigned long i = block_start + bin_index;
				unsigned long j = i + half_block_size;

				double even_real = real_bins[i];
				double even_imag = imag_bins[i];

				double odd_real = real_bins[j];
				double odd_imag = imag_bins[j];

				unsigned long delta_radian = fft_size * bin_index / block_size;

				double twiddle_real = cos_table[radian_scale * delta_radian];
				double twiddle_imag = -cos_table[radian_scale * ((delta_radian + quarter_fft_size) % fft_size)] * sin_sign;

				double twiddle_odd_real = twiddle_real*odd_real - twiddle_imag*odd_imag;
				double twiddle_odd_imag = twiddle_real*odd_imag + twiddle_imag*odd_real;

				real_bins[i] = even_real + twiddle_odd_real;
				imag_bins[i] = even_imag + twiddle_odd_imag;

				real_bins[j] = even_real - twiddle_odd_real;
				imag_bins[j] = even_imag - twiddle_odd_imag;

			}

		}

	}

	return;

}



void compute_fft (unsigned long fft_size, unsigned long radian_scale) {

	fft(fft_size, radian_scale, -1);

	return;

}



void compute_ifft (unsigned long fft_size, unsigned long radian_scale) {

	fft(fft_size, radian_scale, 1);

    // for (unsigned long i = 0; i < fft_size; i++) {
	// 	real_bins[i] = real_bins[i] / fft_size;
	// 	imag_bins[i] = imag_bins[i] / fft_size;
    // }

	return;

}



void filter_magnitudes (unsigned long fft_size, unsigned long radian_scale) {

	// Sensitivity Filter

	for (unsigned long i = 0; i < fft_size; i++) {
		magnitudes[i] *= sensitivities_table[i*radian_scale];
	}



	// Noise Filter

	for (unsigned long i = 0; i < fft_size; i++) {

		// Update noise bed
		double level = magnitudes[i];
		double value = filter_bed[i];
		double target = (level + 0.01*filter_peak) * 1.1;
		
		double new_value = target*filter_sensitivity + value*(1-filter_sensitivity);

		// Apply bias when raising bed
		if (new_value > value) new_value = new_value*(1-filter_bias) + value*(filter_bias);

		filter_bed[i] = new_value;

		// Apply filter
		double new_level = (level - new_value);
		if (!(new_level > 0)) new_level = 0;
		magnitudes[i] = new_level;

	}



	// Normalization

	// Update peak
	double max = 0;
	for (unsigned long i = 0; i < fft_size; i++) if (magnitudes[i] > max) max = magnitudes[i];

	double new_peak = max*filter_sensitivity + filter_peak*(1-filter_sensitivity);

	// Apply bias when lowering peak
	if (new_peak < filter_peak) new_peak = new_peak*(1-filter_bias) + filter_peak*filter_bias;

	// Follow minimum
	if (new_peak < min_filter_peak) new_peak = min_filter_peak;

	filter_peak = new_peak;



	// Follow maximum
	if (max > new_peak) new_peak = max;

	// Apply peak
	for (unsigned long i = 0; i < fft_size; i++) magnitudes[i] /= new_peak;


	
	// Update sensitivity
	if (filter_sensitivity > filter_sensitivity_target) filter_sensitivity *= filter_sensitivity_multiplier;


}



void get_loudness(unsigned long fft_size) {

	for (unsigned long i = 0; i < fft_size; i++) {
		if (magnitudes[i] > output_buffer_loudness) output_buffer_loudness = magnitudes[i];
	}
	
	return;
	
};



void get_full_chroma(unsigned long fft_size, unsigned long radian_scale, unsigned long start_note, unsigned long note_count) {

	// The visualizer chroma buffer serves as the storage for the initial full chroma

	// Reset full chroma buffer
	for (unsigned long i = 0; i < note_count; i++) {
		output_buffer_visualizer_chroma[i] = 0;
	}

	unsigned long last_note = start_note + note_count - 1;

	// Set magnitudes to full chroma buffer
	for (unsigned long i = 0; i < fft_size; i++) {

		unsigned long j = i * radian_scale;

		unsigned long class_1 = pitch_classes_table[j][0];
		unsigned long class_2 = pitch_classes_table[j][1];

		double multiplier_1 = pitch_multipliers_table[j][0];
		double multiplier_2 = pitch_multipliers_table[j][1];

		if (class_1 >= start_note && class_1 <= last_note) {
			output_buffer_visualizer_chroma[class_1 - start_note] += magnitudes[i] * multiplier_1;
		}

		if (class_2 >= start_note && class_2 <= last_note) {
			output_buffer_visualizer_chroma[class_2 - start_note] += magnitudes[i] * multiplier_2;
		}

	}

	// Normalize full chroma
	for (unsigned long i = 0; i < note_count; i++) {
		output_buffer_visualizer_chroma[i] /= total_multipliers_table[i];
	}

	return;

}



void get_chroma(unsigned long start_note, unsigned long note_count, unsigned long output_index) {

	// Dissonance Filter
	for (unsigned long i = 0; i < note_count; i++) {

		double x = output_buffer_visualizer_chroma[i];

		if (x < 0) continue;

		unsigned long h = i - 1;
		unsigned long j = i + 1;

		if (h >= 0) {
			double a = output_buffer_visualizer_chroma[h];
			if (a > 0 && x > a) x += x - a;
		}

		if (j < note_count) {
			double b = output_buffer_visualizer_chroma[j];
			if (b > 0 && x > b) x += x - b;
		}

		filtered_full_chroma[i] = x / 3;

	}

	// Reset chroma bins
	for (unsigned long i = 0; i < 12; i++) {
		output_buffer_chromas[output_index][i] = 0;
	}

	// Put chroma levels into 12 bins
	for (unsigned long i = 0; i < note_count; i++) {
		double value = filtered_full_chroma[i];
		if (value == value) output_buffer_chromas[output_index][(i + start_note) % 12] += value;
	}

	return;
	
}



void get_frequency(double sample_rate, unsigned long fft_size, unsigned long output_index) {

	// Discard slope from the low lag 
	unsigned long i = 0;
	while (i + 1 < fft_size && real_bins[i] > real_bins[i+1]) i++;

	// Get the lag with the highest correlation
	double max_value = -1;
	unsigned long max_index = 0;
	for (; i < fft_size; i++) {
		if (real_bins[i] > max_value) {
			max_value = real_bins[i];
			max_index = i;
		}
	}

	if (max_value < 0.5) goto return_null;
	if (max_index <= 0) goto return_null;

	double lag = max_index;

	if (max_index + 1 < fft_size) {

		// Interpolate and get the maxima
		double x1 = real_bins[max_index-1];
		double x2 = real_bins[max_index];
		double x3 = real_bins[max_index+1];
		double a = (x1 + x3 - 2*x2) / 2;
		double b = (x3 - x1) / 2;

		lag = lag - b / (2*a);

		if (lag <= 0) goto return_null;

	}

	double freq = sample_rate / lag;

	output_buffer_frequencies[output_index] = freq;
	
	return;

return_null:

	output_buffer_frequencies[output_index] = -1;
	
	return;

}



void process_output (double sample_rate, unsigned long fft_size, unsigned long start_note, unsigned long note_count, unsigned long output_index) {

	unsigned long half_fft_size = fft_size/2;

	// Populate bins from cache with in reverse bit order
	reverse_bit_order(fft_size, cache_to_bin);

	// Compute fft
	compute_fft(fft_size, 1);

	// Compute magnitudes from fft bins
	for (unsigned long i = 0; i < half_fft_size + 1; i++) {
		double real_value = real_bins[i];
		double imag_value = imag_bins[i];
		magnitudes[i] = __builtin_sqrt(real_value*real_value + imag_value*imag_value);
	}

	// Noise Filter
	filter_magnitudes(fft_size/2 + 1, 1);
	
	// Get loudness
	get_loudness(fft_size/2 + 1);

	// Get full chroma
	// Use half fft to discard duplicate bins
	get_full_chroma(fft_size/2, 1, start_note, note_count);

	// Get chroma
	get_chroma(start_note, note_count, output_index);

	// Square magnitudes
	for (unsigned long i = 0; i < half_fft_size + 1; i++) magnitudes[i] *= magnitudes[i];

	// Mirror magnitudes to restore full fft
	for (unsigned long i = 1; i < half_fft_size; i++) magnitudes[fft_size - i] = magnitudes[i];

	// Populate bins from magnitudes in reverse bit order
	reverse_bit_order(fft_size, magnitudes_to_bin);

	// Compute inverse fft (autocorelation)
	compute_ifft(fft_size, 1);

	// Get frequency
	get_frequency(sample_rate, fft_size/2, output_index);

	// Quality requires trigonometric functions which can't be used in barebones WASM
	// Get quality
	// get_quality();

	return;

}



int process_input (double sample_rate, unsigned long fft_size, unsigned long fft_interval, unsigned long start_note, unsigned long note_count, unsigned long buffer_size, int skip_output) {

	unsigned long output_count = 0;

	unsigned long buffer_i = 0;

check_progress:

	if (progress >= fft_size) {

		if (!skip_output) {
			process_output(sample_rate, fft_size, start_note, note_count, output_count);
			output_count++;
		}

		cache_index = (cache_index + fft_interval) % max_fft_size;
		progress -= fft_interval;

	}

	if (buffer_i < buffer_size) {

		cache_buffer[next_cache_index] = input_buffer[buffer_i];
		next_cache_index = (next_cache_index + 1) % max_fft_size;

		buffer_i++;
		progress++;

		goto check_progress;

	}

	return output_count;

}