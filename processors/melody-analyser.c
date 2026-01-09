#include <stdint.h> // For uint64_t

#define safe_buffer_size 32768

__attribute__((import_module("env")))
__attribute__((import_name("js_log")))
void js_log(double);

__attribute__((used))
double input_buffer[safe_buffer_size] = {0};

__attribute__((used))
double output_buffer_frequency[safe_buffer_size] = {0};

__attribute__((used))
double output_buffer_loudness[safe_buffer_size] = {0};

double _abs (double value) {
	if (value < 0) {
		return -value;
	}
	return value;
}

double cache[safe_buffer_size] = {0};
unsigned long cache_offset = 0;
unsigned long cache_gap = 0;

double buffer_corr[safe_buffer_size] = {0};

double all_time_peak = 1;

void process_output (long td_size, unsigned int sample_rate, unsigned long cache_index, unsigned long output_offset) {

	// Compute for Peak and RMS
	double peak = 0;
	double rms = 0;

	unsigned long i;
	for (i = 0; i < td_size; i++) {

		double value = cache[(cache_index + i) % safe_buffer_size];
		double abs_value = _abs(value);

		if (abs_value > peak) {
			peak = abs_value;
		}

		rms += value*value;
		
	}

	all_time_peak = peak / 256 + all_time_peak * 255 / 256;

	if (peak <= 0) {
 		output_buffer_loudness[output_offset] = 0;
		goto bad_freq;
	}

	if (all_time_peak > peak) {
		output_buffer_loudness[output_offset] = peak / all_time_peak;
		peak = all_time_peak;
	} else {
 		output_buffer_loudness[output_offset] = 1;
		all_time_peak = peak / 8 + all_time_peak * 7 / 8;
	}
	
	rms = rms / (peak*peak) / td_size;

	if (rms < 0.0001) goto bad_freq; // not enough signal

	// Cut out unfinished waves at both ends of the buffer
	unsigned long r1 = 0;
	unsigned long r2 = td_size - 1;
	double thres = 0.2;

	for (i = 0; i < td_size / 2; i++) {
		if (_abs(cache[i]) < thres) {
			r1 = i;
			break;
		}
	}

	for (i = 1; i < td_size / 2; i++) {
		if (_abs(cache[td_size - i]) < thres) {
			r2 = td_size - i;
			break;
		}
	}


	// Get correlation per lag
	unsigned long r_size = r2 - r1;

	unsigned long lag;
	for (lag = 0; lag < r_size; lag++) {
		buffer_corr[lag] = 0;
		for (i = 0; i < r_size - lag; i++) {
			buffer_corr[lag] += cache[(cache_index + r1 + i) % safe_buffer_size] * cache[(cache_index + r1 + i + lag) % safe_buffer_size];
		}
	}

	// Discard slope from the low lag
	unsigned long d = 0;
	while (buffer_corr[d] > buffer_corr[d+1] && d + 1 < td_size) {
		d++;
	};

	// Get the lag with the highest correlation
	double maxval = -1;
	unsigned long maxpos = 0;

	for (i = d; i < td_size; i++) {
		if (buffer_corr[i] > maxval) {
			maxval = buffer_corr[i];
			maxpos = i;
		}
	}

	double T0 = maxpos;

	if (maxpos <= 0) goto bad_freq;

	if (maxpos + 1 < td_size) {

		// Interpolate and get the maxima
		double x1 = buffer_corr[maxpos-1];
		double x2 = buffer_corr[maxpos];
		double x3 = buffer_corr[maxpos+1];
		double a = (x1 + x3 - 2*x2) / 2;
		double b = (x3 - x1)/2;

		if (a != 0) {
			T0 = T0 - b / (2*a);
		}

		if (T0 <= 0) goto bad_freq;

	}

	output_buffer_frequency[output_offset] = sample_rate / T0;

	return;

bad_freq:
	output_buffer_frequency[output_offset] = -1;

	return;

}

unsigned long process_input (unsigned long td_size, unsigned long td_interval, unsigned int sample_rate, unsigned long buffer_size, int skip_output) {

	unsigned long output_count = 0;

	unsigned long i;

	for (i = 0; i < buffer_size; i++) {

		cache_gap++;

		if (cache_gap >= td_interval) {

			if (!skip_output) {
				process_output(td_size, sample_rate, (cache_offset + safe_buffer_size - td_size) % safe_buffer_size, output_count);
				output_count++;
			}
			
			cache_gap = 0;

		}

		cache[cache_offset] = input_buffer[i];

		cache_offset = (cache_offset + 1) % safe_buffer_size;

	}

	return output_count;

}