#define safe_note_count 120
#define safe_buffer_size 32768

double min_peak = 0.0001;

__attribute__((import_module("env")))
__attribute__((import_name("js_log")))
void js_log(double);

__attribute__((used))
double sin_table[safe_note_count] = {0};

__attribute__((used))
double cos_table[safe_note_count] = {0};

__attribute__((used))
double input_buffer[safe_buffer_size] = {0};

__attribute__((used))
double output_buffer_chroma[safe_buffer_size*safe_note_count] = {0};

__attribute__((used))
double output_buffer_peak[safe_buffer_size] = {0};

// __attribute__((used))
// double max_values_sqr[safe_note_count] = {0};

// __attribute__((used))
// unsigned int cutoffs[safe_note_count] = {0};

// __attribute__((used))
// double max_value_sqr = 0;

__attribute__((used))
double sensitivities_sqr[safe_note_count] = {0};

typedef struct {
    double n_1;
    double n_2;
} S;

S sss[safe_buffer_size][safe_note_count] = {{{0}}};

long mm[safe_buffer_size] = {0};
long min_m = 0;
unsigned int m_count = 1;
// this is NOT the index which contains min_m
// it's the index of the max m, but it's the smallest index
unsigned int start_m_index = 0;

double all_time_peak = 0;

double get_value (unsigned int note, S* s) {

	double cos = cos_table[note];
	double sin = sin_table[note];
	double y_r = s->n_1 - cos * s->n_2;
	double y_i = sin * s->n_2;

	return (y_r*y_r + y_i*y_i); // / max_value_sqr;

}

void process_output (unsigned long dft_size, unsigned int note_count, unsigned int m_index, unsigned long output_offset) {

	output_buffer_peak[output_offset] = 1; // initial peak

	unsigned long chroma_offset = output_offset*note_count;

	unsigned int note;

	for (note = 0; note < note_count; note++) {
		output_buffer_chroma[note + chroma_offset] = 0;
	}

	for (note = 0; note < note_count; note++) {

		S* s = &sss[m_index][note];

		double value = get_value(note, s) / (dft_size*dft_size) * 4 * sensitivities_sqr[note];

		output_buffer_chroma[note + chroma_offset] += value;

		s->n_1 = 0;
		s->n_2 = 0;

	}

	double peak = 0;

	for (note = 0; note < note_count; note++) {
		double value = output_buffer_chroma[note + chroma_offset];

		if (value > peak) {
			peak = value;
		}
	}

	all_time_peak = peak / 1024 + all_time_peak * 1023 / 1024;

	if (all_time_peak < min_peak) {
		all_time_peak = min_peak;
	}

	if (all_time_peak > peak) {
		peak = all_time_peak;
	} else {
		all_time_peak = peak / 64 + all_time_peak * 63 / 64;
	}

	if (peak <= 0) return;

	for (note = 0; note < note_count; note++) {
		output_buffer_chroma[note + chroma_offset] /= peak;
	}

	output_buffer_peak[output_offset] = peak;

	return;

}

int process_input (unsigned long dft_size, unsigned long dft_interval, unsigned long note_count, unsigned long buffer_size, int skip_output) {

	unsigned long output_count = 0;

	min_m += buffer_size;

	if (min_m > dft_interval) {

		min_m = min_m - dft_interval;

		mm[start_m_index + m_count] = min_m - buffer_size;

		m_count++;

	}

	unsigned long m_index = start_m_index;

	unsigned long m_i;

	for (m_i = 0; m_i < m_count; m_i++) {

		int m_has_output = 0;

		long m = mm[m_index];

		unsigned long n;

		for (n = 0; n < buffer_size; n++) {

			if (m < 0) {
				m++;
				
				continue;
			}

			double x_n = input_buffer[n];

			unsigned int note;

			// double cutoff = cutoffs[note];

			for (note = 0; note < note_count; note++) {

				S* s = &sss[m_index][note];

				double cos = cos_table[note];

				double s_n = x_n + 2 * cos * s->n_1 - s->n_2;
				s->n_2 = s->n_1;
				s->n_1 = s_n;
				
			}

			m++;
			
			if (m >= dft_size) {

				m_has_output = 1;

				break;

			}

		}

		if (m_has_output > 0) {

			if (!skip_output) {
				process_output(dft_size, note_count, m_index, output_count);
				output_count++;
			}
			
			mm[m_index] = 0;

			start_m_index = (start_m_index + 1) % safe_buffer_size;
			
			m_count--;

		} else {

			mm[m_index] = m;

		}

		m_index = (m_index + 1) % safe_buffer_size;

	}

	return output_count;

}