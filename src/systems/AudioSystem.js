const ToneMap = {
  jump: 440,
  land: 220,
  detect: 740,
  caught: 160,
  gem: 520,
  goal: 600,
  ui: 480,
};

export class AudioSystem {
  constructor(settings) {
    this.bgmVolume = settings.bgmVolume ?? 60;
    this.seVolume = settings.seVolume ?? 70;
    this.context = null;
    this.bgmOscillator = null;
    this.bgmGain = null;
    this.unlocked = false;
  }

  unlock() {
    if (this.unlocked) return;
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    this.unlocked = true;
  }

  updateSettings(settings) {
    this.bgmVolume = settings.bgmVolume;
    this.seVolume = settings.seVolume;
    if (this.bgmGain) {
      this.bgmGain.gain.value = this.bgmVolume / 100 * 0.08;
    }
  }

  playSE(name) {
    if (!this.unlocked) return;
    const frequency = ToneMap[name] ?? 400;
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = (this.seVolume / 100) * 0.12;
    osc.frequency.value = frequency;
    osc.type = "triangle";
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  startBgm(isChase) {
    if (!this.unlocked) return;
    if (this.bgmOscillator) {
      this.stopBgm();
    }
    const ctx = this.context;
    this.bgmOscillator = ctx.createOscillator();
    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.value = (this.bgmVolume / 100) * 0.08;
    this.bgmOscillator.frequency.value = isChase ? 180 : 120;
    this.bgmOscillator.type = "sine";
    this.bgmOscillator.connect(this.bgmGain);
    this.bgmGain.connect(ctx.destination);
    this.bgmOscillator.start();
  }

  stopBgm() {
    if (this.bgmOscillator) {
      this.bgmOscillator.stop();
      this.bgmOscillator.disconnect();
      this.bgmGain.disconnect();
      this.bgmOscillator = null;
      this.bgmGain = null;
    }
  }
}
