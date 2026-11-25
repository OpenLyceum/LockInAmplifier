# Implementation notes

## Sampling budget

The animation loop calls a screen model with wall time. `TimeModel` gates and scales elapsed time for play, pause, or fast mode. `SampleClock` keeps the fractional remainder when converting accepted time to whole samples at 20,480 Hz. A 60 Hz frame schedules about 341 samples. The ordinary cap is 0.25 simulated seconds, or 5,120 samples per frame. Filtering's explicit 10× mode uses a 5-second simulated-time cap, or 102,400 samples. Time beyond the cap is discarded so a backgrounded tab does not acquire a backlog.

A sample evaluates the source and seeded noise, mixes with the reference, updates the filter cascades, and writes history. Lab clips the detector input and preserves the unclipped voltage for its scope. Buffers are Float64Array rings. The bridge keeps mutable complex scratch, noise keeps pole state and a spare Gaussian, and spectra reuse FFT and Hann buffers. Model properties publish at batch boundaries. FFT work occurs on complete acquisitions and model or view settings may rebuild buffers outside the per-sample loop.

## Scope and chart updates

The scope keeps signal values and carrier phase in separate, synchronized rings. For a given view window, the trigger search walks backward to the newest falling phase wrap that has the whole requested record after it. It copies chronological samples into caller-provided scratch. If the history is too short or no wrap qualifies, it copies the newest available samples. The common trigger aligns traces and keeps the waveform stationary while the sample clock advances.

An 80-sample block average feeds time histories at 256 Hz. Scenery views throttle time traces and the phasor trail to 30 redraws per wall-clock second. Spectra and the Filtering histogram target 5 Hz. Changing the shared voltage axis can redraw the histogram sooner to keep it aligned. Gain and scaling plots respond to settings or recorded measurements. The Lab response plots consume recorded rows and update when the notebook changes.

The PDOM carries localized chart descriptions, readouts, and changes such as a recorded sample or a cleared overload. A redraw produces no per-point announcement.
