export type TickType = 'classic' | 'wood' | 'digital';
export type AlarmType = 'classic' | 'pulse' | 'chime';

declare global {
  interface Window {
    __vpBgMusicDebug?: {
      getSnapshot: () => {
        src: string;
        paused: boolean;
        muted: boolean;
        volume: number;
        currentTime: number;
        readyState: number;
        networkState: number;
        error: string | null;
      } | null;
      getState: () => {
        isActive: boolean;
        musicEnabled: boolean;
        bgMusicUrl: string | null;
        bgMusicName: string | null;
        isMusicPlaying: boolean;
      };
    };
  }
}

export class SoundManager {
  private audioCtx: AudioContext | null = null;
  private tickType: TickType = 'classic';
  private alarmType: AlarmType = 'classic';

  private logSfx(label: string) {
    const debug = typeof window !== 'undefined' ? window.__vpBgMusicDebug : undefined;
    const state = debug?.getState?.();
    const visibility = typeof document !== 'undefined' ? document.visibilityState : 'unknown';
    const stackLine = new Error()
      .stack?.split('\n')
      .map((line) => line.trim())
      .find((line) => line.includes('useTimer') || line.includes('App'));

    console.info('[sfx]', label, {
      at: new Date().toISOString(),
      visibility,
      isActive: state?.isActive ?? null,
      isMusicPlaying: state?.isMusicPlaying ?? null,
      source: stackLine ?? 'unknown',
    });
  }

  private init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private withReadyContext(run: (ctx: AudioContext) => void) {
    this.init();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;

    if (ctx.state !== 'running') {
      void ctx.resume()
        .then(() => {
          if (!this.audioCtx || this.audioCtx !== ctx) return;
          if (ctx.state !== 'running') {
            return;
          }
          run(ctx);
        })
        .catch(() => {
          // Keep silent on resume failures; caller side remains stable.
        });
      return;
    }

    run(ctx);
  }

  prepare() {
    this.withReadyContext(() => {
      // Warm the audio context without producing any sound.
    });
  }

  setTickType(type: TickType) {
    this.tickType = type;
  }

  setAlarmType(type: AlarmType) {
    this.alarmType = type;
  }

  playTick() {
    this.logSfx('playTick');
    this.withReadyContext((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      let stopAt = ctx.currentTime + 0.05;

      switch (this.tickType) {
        case 'wood':
          {
            const noiseFrameCount = Math.ceil(ctx.sampleRate * 0.018);
            const noiseBuffer = ctx.createBuffer(1, noiseFrameCount, ctx.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseFrameCount; i += 1) {
              noiseData[i] = Math.random() * 2 - 1;
            }

            const noise = ctx.createBufferSource();
            const clickFilter = ctx.createBiquadFilter();
            const clickGain = ctx.createGain();

            noise.buffer = noiseBuffer;
            clickFilter.type = 'bandpass';
            clickFilter.frequency.setValueAtTime(2100, ctx.currentTime);
            clickFilter.Q.setValueAtTime(2.1, ctx.currentTime);
            clickGain.gain.setValueAtTime(0.085, ctx.currentTime);
            clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.011);

            noise.connect(clickFilter);
            clickFilter.connect(clickGain);
            clickGain.connect(ctx.destination);
            noise.start(ctx.currentTime);
            noise.stop(ctx.currentTime + 0.014);
          }

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(680, ctx.currentTime);
          gain.gain.setValueAtTime(0.024, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
          stopAt = ctx.currentTime + 0.022;
          break;
        case 'digital':
          osc.type = 'square';
          osc.frequency.setValueAtTime(1200, ctx.currentTime);
          gain.gain.setValueAtTime(0.05, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.02);
          break;
        default: // classic
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(stopAt);
    });
  }

  playAlarm(secondsLeft: number) {
    this.withReadyContext((ctx) => {
      const now = ctx.currentTime;

      switch (this.alarmType) {
        case 'pulse':
          const oscP = ctx.createOscillator();
          const gainP = ctx.createGain();
          oscP.type = 'sine';
          oscP.frequency.setValueAtTime(660, now);
          gainP.gain.setValueAtTime(0.2, now);
          gainP.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          oscP.connect(gainP);
          gainP.connect(ctx.destination);
          oscP.start(now);
          oscP.stop(now + 0.1);
          break;
        case 'chime':
          [523.25, 659.25, 783.99].forEach((f, i) => {
            const oscC = ctx.createOscillator();
            const gainC = ctx.createGain();
            oscC.type = 'sine';
            oscC.frequency.setValueAtTime(f, now + i * 0.05);
            gainC.gain.setValueAtTime(0.1, now + i * 0.05);
            gainC.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.3);
            oscC.connect(gainC);
            gainC.connect(ctx.destination);
            oscC.start(now + i * 0.05);
            oscC.stop(now + i * 0.05 + 0.3);
          });
          break;
        default: // classic
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const freq = 440 + (10 - secondsLeft) * 50;
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(now + 0.3);
      }
    });
  }

  playFinish() {
    this.withReadyContext((ctx) => {
      const now = ctx.currentTime;
      [440, 554.37, 659.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.2, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.5);
      });
    });
  }
}

export const soundManager = new SoundManager();
