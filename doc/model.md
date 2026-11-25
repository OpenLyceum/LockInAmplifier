# Model

The instrument measures a component of an input voltage that is coherent with a reference. Signal and Noise shows the voltage and its spectrum. Mixing exposes the product and its sum and difference frequencies. Filtering compares noise rejection with settling time. Phase Detection shows the signed quadratures. The Lab uses the same detector to measure three unknowns.

The model uses volts, seconds, hertz, radians, farads, and dimensionless strain. Voltage amplitudes are **peak** unless labeled RMS. For a sine of peak amplitude $A$, the average of $A^2\sin^2$ is $A^2/2$, so $V_{\rm rms}=A/\sqrt{2}$. The reference has gain 2 so a matched peak-amplitude input reads $X=A$. An RMS-calibrated instrument would display $A/\sqrt{2}$ for that input.

## Signal and reference

The sample interval is $\Delta t=1/f_s$, where $f_s=20{,}480$ Hz denotes the **sample rate** throughout this document. An oscillator advances its carrier by $2\pi f\Delta t$ per sample, modulo $2\pi$. Accumulating the phase makes a frequency edit continuous. The input is $D+A\sin(\psi+\phi)$, or $D+A[(\psi+\phi)\bmod 2\pi<\pi]$ for a 50% duty-cycle unipolar square wave.

For carrier phase $\psi_r$, selected harmonic $h\in\{1,2,3\}$, and reference phase $\theta$, let $b=h\psi_r+\theta$. The sine reference supplies $2\sin b$ and $2\cos b$. The square reference supplies $(\pi/2)\operatorname{sgn}(\sin b)$ and $(\pi/2)\operatorname{sgn}(\cos b)$. Integrating a bipolar square over a period gives a sine series with coefficients $4/(\pi k)$ for odd $k$, zero for even $k$. The gain $\pi/2$ gives a fundamental of 2 and odd harmonics with gain $2/k$. The cosine reference follows by shifting the same square by $\pi/2$. Locking makes the reference follow the source carrier frequency.

## Mixing and phase

Each sample $v$ is multiplied by each reference, then passed through independent copies of the same low-pass filter. Let $a$ denote the input phase including its carrier. The identities
$$
2\sin a\sin b=\cos(a-b)-\cos(a+b),\qquad
2\sin a\cos b=\sin(a-b)+\sin(a+b)
$$
show why the sum component is rejected. The difference component is DC at matched frequency and rotates at the difference frequency when detuned. For $v=A\sin(\omega t+\phi)$ and a matched sine reference, the settled readings are $X=A\cos(\phi-\theta)$, $Y=A\sin(\phi-\theta)$. Thus $R=\operatorname{hypot}(X,Y)$ and $\Theta=\operatorname{atan2}(Y,X)$. The convention is $v(t)=|V|\sin(\omega t+\arg V)$, with $X=\Re V$ and $Y=\Im V$ at $\theta=0$. Increasing $\theta$ by the measured $\Theta$ rotates the output by $-\Theta$, setting $Y=0$ and $X=R$. In Phase Detection, rotating the common filtered frame makes this visible immediately. In the Lab, the filtered channels settle after the reference edit. In the single-phase detector only X is measured.

## Low-pass filter

For a held input $x$, solving $\tau\,dy/dt=x-y$ across one sample gives $y\gets y+\alpha(x-y)$, with $\alpha=1-e^{-\Delta t/\tau}$. Each of the $n\in\{1,2,3,4\}$ stages applies that update to the previous stage's output. Time-constant edits retain the section state. The detents are 1, 3, 10, 30, 100, 300 ms and 1, 3, 10 s.

Multiplying the stage transfer functions gives $H(f)=(1+j2\pi f\tau)^{-n}$, so $|H(f)|=[1+(2\pi f\tau)^2]^{-n/2}$. Doubling frequency well above cutoff changes amplitude by $2^{-n}$, about $6n$ dB per octave. Setting $|H|^2=1/2$ gives $f_{-3\,\mathrm{dB}}=\sqrt{2^{1/n}-1}/(2\pi\tau)$.

The one-sided equivalent noise bandwidth is the area under the normalized power response. Substitute $u=2\pi f\tau$ in $\int_0^\infty|H(f)|^2df$ and use $\int_0^\infty(1+u^2)^{-n}du=\sqrt{\pi}\,\Gamma(n-1/2)/(2\Gamma(n))$. The result is $\Gamma(n-1/2)/(4\sqrt{\pi}\Gamma(n)\tau)$, or $1/(4\tau),1/(8\tau),3/(32\tau),5/(64\tau)$ for orders 1 through 4.

The $n$-stage impulse response is the $n$-fold convolution of exponential densities, $e^{-t/\tau}(t/\tau)^{n-1}/[\tau(n-1)!]$ for $t\ge0$. Its integral to $t=x\tau$ is $1-e^{-x}\sum_{k=0}^{n-1}x^k/k!$. Bisection finds the specified fraction. At 99%, the times are about 4.605τ, 6.638τ, 8.406τ, and 10.045τ. At fixed order ten times the time constant reduces noise by $\sqrt{10}$ and multiplies settling time by ten.

## Noise and spectrum

A one-sided white density $e_n$ in V/√Hz has variance $e_n^2 f_s/2$ after integrating from DC to Nyquist. Each white sample is therefore $e_n\sqrt{f_s/2}$ times a unit Gaussian. Multiplication by $2\sin b$ translates two copies of the white spectrum to baseband with unit gain per copy. Their PSDs add, giving $\sigma_X^2=2e_n^2\mathrm{ENBW}$, or $\sigma_X=\sqrt{2}\,e_n\sqrt{\mathrm{ENBW}}$. This uses a matched sine reference with a passband narrow relative to carrier and Nyquist. The input band SNR uses $20\log_{10}[(A/\sqrt2)/(e(f)\sqrt{B})]$ with locally flat broadband density $e(f)$. Wideband SNR substitutes total stationary input noise RMS for the denominator.

For 1/f noise, ten independent unit-variance AR(1) poles are spaced geometrically from 0.5 Hz to 5 kHz. A pole at $f_p$ has $a=e^{-2\pi f_p/f_s}$ and update $y\gets ay+\sqrt{1-a^2}\,g$ with unit Gaussian $g$. Its stationary variance is 1 because $a^2+(1-a^2)=1$. The one-sided PSD is $(2/f_s)(1-a^2)/|1-ae^{-j2\pi f/f_s}|^2$. In the continuous approximation the individual PSD is proportional to $f_p/(f_p^2+f^2)$. Logarithmic spacing supplies the measure $df_p/f_p$, so the sum approximates $\int df_p/(f_p^2+f^2)\propto 1/f$ inside the band. Normalize the discrete PSD sum $S$ by applying the gain $e_n/\sqrt{S(f_c)}$. This matches the white PSD at the selected crossover $f_c$, with approximate pink density $e_n\sqrt{f_c/f}$ away from the ends.

Mains pickup is $a_m[\sin(2\pi f_m t)+0.3\sin(6\pi f_m t)]$ at 50 or 60 Hz. Its variance is $a_m^2(1+0.3^2)/2$ because the two sinusoids are orthogonal. Lab drift adds independent Gaussian increments of standard deviation $D_w\sqrt{\Delta t}$ for drift strength $D_w$ in V/√s. This yields variance $D_w^2t$ after elapsed time $t$.

The periodic Hann weights are $w_i=(1-\cos(2\pi i/N))/2$. A bin-centered sinusoid contributes a positive-frequency term of magnitude $A\sum w_i/2$ to the DFT, so $2|X_k|/\sum w_i$ reads $A$ in an interior bin. DC and Nyquist use the same scale in the helper. Summing the periodic window yields $\sum w_i=N/2$ and $\sum w_i^2=3N/8$, giving resolution bandwidth $f_s\sum w_i^2/(\sum w_i)^2=1.5 f_s/N$. Nonoverlapping records contain 2,048, 8,192 or 32,768 samples (0.1, 0.4 or 1.6 s). Averaging squared amplitudes across 1, 4, 16 or 64 records reduces scatter while retaining the expected noise power. The amplitude view takes the square root after averaging.

For time histories, averaging 80 consecutive samples yields one chart sample at 256 Hz. A sliding Welford window tracks the mean $\mu$ and sum of squared deviations $M_2$. For an incoming value $v$, $\mu'=\mu+(v-\mu)/(N+1)$ and $M_2'=M_2+(v-\mu)(v-\mu')$. Removing the oldest value reverses this update. The population variance is $M_2/N$; 40 histogram bins span $\mu\pm4\sigma$ with outliers counted in the end bins. Filtering samples the instantaneous X at block boundaries for the histogram statistics so block averaging does not reduce the measured noise.

## Virtual experiments

- **Optical chopper.** The photodiode voltage is $G[I_{bg}(1+0.2\sin(2\pi(2f_m)t))+T I_{LED}c(t)]$, where $c(t)$ is the blade's 0/1 gate and $T=1$ for an open beam. Since $c=(1+\operatorname{sgn}(\sin))/2$, the fundamental amplitude is $2/\pi$, higher odd terms fall as $1/k$, and the even terms vanish. The factor cancels when dividing a sample's fundamental by the open-beam reading. Transmission is drawn from 0.05–0.9. At a chopping frequency close to $2f_m$, room light creates beats at the difference frequency.
- **Wheatstone bridge.** Let $R_0$ be a fixed arm, $\delta=2\epsilon$ the strain-induced fractional resistance change, and $Z$ the parallel combination of $R_0(1+\delta)$ and stray capacitance $C_s$. The complex divider is $Z/(Z+R_0)=[1+1/(1+\delta)+j\omega R_0C_s]^{-1}$. The output phasor is $V_{ex}[Z/(Z+R_0)-Z_t/(Z_t+R_0)]$, where the trim arm substitutes $\delta_t,C_t$. Expanding near zero gives $(\delta-\delta_t)/4-j\omega R_0(C_s-C_t)/4$. A resistive reading near zero trim estimates $\delta\approx4X/V_{ex}$ at $\theta=0$. Nulling both quadratures makes the trim settings measure the hidden arm directly. Strain is drawn from 100–1,000 µε and capacitance from 5–50 pF.
- **RC low-pass.** The capacitor divider gives $H=(1+j\omega RC)^{-1}=(1-jf/f_c)/(1+(f/f_c)^2)$, where $f_c=(2\pi RC)^{-1}$. At $f=f_c$, the magnitude is $1/\sqrt{2}$ and phase is −45°. The cutoff is drawn from 80–2,000 Hz. With the reference phase removed, the notebook estimates cutoff by interpolating around −45° in log frequency, or from $f/\tan(-\Theta)$ for a single usable phase measurement.

## Approximations and sources

The multiplier is ideal and the external reference is phase-coherent once a fixed relock interval expires. There are no PLL dynamics. Dynamic reserve is represented by input clipping, an overload hold, and an output sensitivity comparison. The model omits detailed analog gain stages, harmonic distortion, ADC quantization, component tolerances outside the modeled unknowns, and correlations among noise sources. Pink noise is a finite Lorentzian sum. The continuous filter curves describe the underlying RC sections, while the running detector uses discrete updates.

- John H. Scofield, “Frequency-domain description of a lock-in amplifier,” *American Journal of Physics* **62**, 129–133 (1994). Frequency translation, phase-sensitive detection, and noise at baseband.
- Stanford Research Systems, *SR830 DSP Lock-In Amplifier Operating Manual*, chapter 3. Instrument conventions, time constants, slopes, equivalent noise bandwidth, and settling times.
- Paul Horowitz and Winfield Hill, *The Art of Electronics*, 3rd ed. (Cambridge University Press, 2015). Background on RC transfer functions, noise, bridge measurement, and synchronous detection.
