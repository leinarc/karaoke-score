#define safe_buffer_size 32768

__attribute__((import_module("env")))
__attribute__((import_name("js_log")))
void js_log(double);

__attribute__((used))
double input_buffer[safe_buffer_size] = {0};

__attribute__((used))
double output_buffer[safe_buffer_size * 2] = {0};

double _abs (double value) {
	if (value < 0) {
		return -value;
	}
	return value;
}

double cache[safe_buffer_size] = {0};
unsigned long cache_offset = 0;
unsigned long cache_gap = 0;

void process_output (long td_size, unsigned int sample_rate, unsigned long cache_offset, unsigned long output_offset) {

	output_buffer[0 + output_offset*2] = -1; // initial freq

	// Compute peak and RMS
	double peak = 0;
	double rms = 0;

	unsigned int i;

	for (i = 0; i < td_size; i++) {

		double value = cache[(i + cache_offset) % safe_buffer_size];
		double abs_value = _abs(value);
		if (abs_value > peak) {
			peak = abs_value;
		}

		rms += value * value;
		
	}

	output_buffer[1 + output_offset*2] = peak;

	// cannot get square root because no libraries
	rms = rms / td_size;

	if (rms < 0.0001) { // not enough signal
		return;
	}

	// Reduce buffer to a smaller length
	unsigned long r1 = 0;
	unsigned long r2 = td_size - 1;
	double thres = 0.2;

	for (i = 0; i < td_size / 2; i++) {
		if (_abs(cache[(i + cache_offset) % safe_buffer_size]) < thres) {
			r1 = i;
			break;
		}
	}

	for (i = 1; i < td_size / 2; i++) {
		if (_abs(cache[(td_size - i + cache_offset) % safe_buffer_size]) < thres) {
			r2 = td_size - i;
			break;
		}
	}

	// Get correlation per lag
	unsigned long c_size = r2 - r1;
	double c[safe_buffer_size] = {0};

	unsigned int j;

	for (i = r1; i < r2; i++) {
		for (j = 0; j < r2 - i; j++) {
			c[i - r1] += cache[(r1 + j + cache_offset) % safe_buffer_size] * cache[(i + j + cache_offset) % safe_buffer_size];
		}
	}

	// Discard dip from the lowest frequency 
	unsigned long d = 1;
	while (c[d] > c[d+1]) {
		d++;
	}

	// Get the lag with the highest correlation
	double valthres = 1;

	double maxval = -1;
	unsigned long maxpos = -1;

	for (i = d; i < c_size; i++) {
		if (c[i] > maxval && c[i] > valthres) {
			maxval = c[i];
			maxpos = i;
		}
	}

	// Interpolate and get the peak
	double x1 = c[maxpos-1];
	double x2 = c[maxpos];
	double x3 = c[maxpos+1];
	double a = (x1 + x3 - 2*x2) / 2;
	double b = (x3 - x1)/2;

	double T0 = maxpos;

	if (a != 0) {
		T0 = T0 - b / (2*a);
	}

	output_buffer[0 + output_offset*2] = sample_rate / T0;

	return;
}

unsigned long process_input (long td_size, long td_overlap, unsigned int sample_rate, unsigned long buffer_size) {

	unsigned long output_count = 0;

	unsigned long i;

	int td_gap = td_size - td_overlap;

	for (i = 0; i < buffer_size; i++) {

		cache_gap++;

		if (cache_gap >= td_gap) {

			process_output(td_size, sample_rate, cache_offset - td_size, output_count);

			output_count++;

			cache_gap = 0;

		}

		cache[cache_offset] = input_buffer[i];

		cache_offset = (cache_offset + 1) % safe_buffer_size;

	}

	return output_count;

}