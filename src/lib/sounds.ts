export type TickType = 'classic' | 'wood' | 'digital';
export type AlarmType = 'classic' | 'pulse' | 'chime';

export class SoundManager {
  private audioCtx: AudioContext | null = null;
  private tickType: TickType = 'classic';
  private alarmType: AlarmType = 'classic';

  private init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  setTickType(type: TickType) {
    this.tickType = type;
  }

  setAlarmType(type: AlarmType) {
    this.alarmType = type;
  }

  playTick() {
    this.init();
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    switch (this.tickType) {
      case 'wood':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.03);
        break;
      case 'digital':
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.02);
        break;
      default: // classic
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.05);
    }

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.05);
  }

  playAlarm(secondsLeft: number) {
    this.init();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;

    switch (this.alarmType) {
      case 'pulse':
        const oscP = this.audioCtx.createOscillator();
        const gainP = this.audioCtx.createGain();
        oscP.type = 'sine';
        oscP.frequency.setValueAtTime(660, now);
        gainP.gain.setValueAtTime(0.2, now);
        gainP.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscP.connect(gainP);
        gainP.connect(this.audioCtx.destination);
        oscP.start(now);
        oscP.stop(now + 0.1);
        break;
      case 'chime':
        [523.25, 659.25, 783.99].forEach((f, i) => {
          const oscC = this.audioCtx.createOscillator();
          const gainC = this.audioCtx.createGain();
          oscC.type = 'sine';
          oscC.frequency.setValueAtTime(f, now + i * 0.05);
          gainC.gain.setValueAtTime(0.1, now + i * 0.05);
          gainC.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.3);
          oscC.connect(gainC);
          gainC.connect(this.audioCtx.destination);
          oscC.start(now + i * 0.05);
          oscC.stop(now + i * 0.05 + 0.3);
        });
        break;
      default: // classic
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const freq = 440 + (10 - secondsLeft) * 50;
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(now + 0.3);
    }
  }

  playFinish() {
    this.init();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    [440, 554.37, 659.25].forEach((freq, i) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.2, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.5);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.5);
    });
  }
}

export const soundManager = new SoundManager();
