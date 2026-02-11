void reverse_bit_bins (unsigned long fft_size, unsigned long cache_index);

void fft (unsigned long fft_size, int sin_sign);

void compute_fft (unsigned long fft_size);

void compute_ifft (unsigned long fft_size);

void compute_autocorrelation (unsigned long fft_size);

void process_output (unsigned long fft_size, unsigned int note_count, unsigned int cache_index, unsigned long output_index);

int process_input (unsigned long fft_size, unsigned long fft_interval, unsigned long note_count, unsigned long buffer_size, int skip_output);