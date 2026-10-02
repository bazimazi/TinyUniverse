import type { Settings } from '../core/types.ts';
export class AmbientAudio {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  configure(settings: Settings, scale = 'planet'): void {
    if (typeof AudioContext === 'undefined') return;
    if (!this.context && (settings.music || settings.sound)) {
      this.context = new AudioContext(); this.gain = this.context.createGain(); this.gain.gain.value = 0; this.gain.connect(this.context.destination);
      this.oscillators = [0, 1].map(() => { const osc = this.context!.createOscillator(); osc.type = 'sine'; osc.connect(this.gain!); osc.start(); return osc; });
    }
    if (!this.context) return;
    if (this.context.state === 'suspended' && (settings.music || settings.sound)) void this.context.resume();
    const frequency = scale === 'planet' ? 64 : scale === 'system' ? 48 : 36;
    this.oscillators.forEach((osc, i) => osc.frequency.setTargetAtTime(frequency * (i ? 1.5 : 1), this.context!.currentTime, 0.5));
    this.gain!.gain.setTargetAtTime(settings.music ? 0.012 : 0, this.context.currentTime, 0.5);
  }
  discovery(enabled: boolean): void {
    if (!enabled || !this.context) return;
    const oscillator = this.context.createOscillator(), gain = this.context.createGain(), now = this.context.currentTime;
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(523.25, now); oscillator.frequency.setValueAtTime(783.99, now + 0.15);
    gain.gain.setValueAtTime(0.025, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    oscillator.connect(gain); gain.connect(this.context.destination); oscillator.start(); oscillator.stop(now + 0.7);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  suspend(): void { if (this.context) void this.context.suspend(); }
}
