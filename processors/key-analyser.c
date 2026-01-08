#define safe_note_count 120
#define safe_buffer_size 32768

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
double output_buffer[safe_note_count] = {0};

__attribute__((used))
unsigned int cutoffs[safe_buffer_size] = {0};

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

double get_magnitude (unsigned int note, S* s) {

	double cos = cos_table[note];
	double sin = sin_table[note];
	double y_r = s->n_1 - cos * s->n_2;
	double y_i = sin * s->n_2;

	return y_r*y_r + y_i*y_i;

}

void process_output (unsigned int note_count, unsigned int m_index) {

	unsigned int output_bins = note_count;

	unsigned int note;

	for (note = 0; note < output_bins; note++) {

		output_buffer[note] = 0;
		
	}

	for (note = 0; note < note_count; note++) {

		S* s = &sss[m_index][note];

		double mag = get_magnitude(note, s);

		output_buffer[note] += mag;

		s->n_1 = 0;
		s->n_2 = 0;

	}

	return;

}

int process_input (long dft_size, long dft_overlap, unsigned long note_count, unsigned long buffer_size) {

	unsigned int output_bins = note_count;

	int has_output = 0;

	int m_gap = dft_size - dft_overlap;

	min_m += buffer_size;

	if (min_m > m_gap) {

		min_m = min_m - m_gap;

		mm[start_m_index + m_count] = min_m - buffer_size;

		m_count++;

	}

	unsigned int m_index = start_m_index;

	unsigned int m_i;

	for (m_i = 0; m_i <= m_count; m_i++) {

		int m_has_output = 0;

		long m = mm[m_index];

		unsigned int n;

		for (n = 0; n < buffer_size; n++) {

			if (m < 0) {
				m++;
				
				continue;
			}

			double x_n = input_buffer[n];

			unsigned int note;

			unsigned int cutoff = cutoffs[m];

			for (note = 0; note < note_count && note < cutoff; note++) {

				S* s = &sss[m_index][note];

				double cos = cos_table[note];

				double s_n = x_n + 2 * cos * s->n_1 - s->n_2;
				s->n_2 = s->n_1;
				s->n_1 = s_n;
				
			}

			m++;
			
			if (m >= dft_size) {

				has_output = output_bins;
				
				m_has_output = output_bins;

				break;

			}

		}

		if (m_has_output > 0) {

			process_output(note_count, m_index);
			
			mm[m_index] = 0;

			start_m_index = (start_m_index + 1) % safe_buffer_size;
			
			m_count--;

		} else {

			mm[m_index] = m;

		}

		m_index = (m_index + 1) % safe_buffer_size;

	}

	return has_output;

}