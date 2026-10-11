// Fixed element/animation pools. Precomputed paths avoid per-hit particle math and allocations.
const FX = {
  hitFlash: [{opacity: .55}, {opacity: 0}], wrongFlash: [{opacity: .6}, {opacity: 0}],
  rebound: [{transform: 'translateY(4px) scale(.9)'}, {transform: 'translateY(-3px) scale(1.045)', offset: .35}, {transform: 'translateY(0) scale(1)'}],
  shake: [{transform: 'translateX(0)'}, {transform: 'translateX(-3px)', offset: .2}, {transform: 'translateX(3px)', offset: .45}, {transform: 'translateX(0)'}],
  judge: [{transform: 'translateY(10px) scale(.7)', opacity: .4}, {transform: 'translateY(-3px) scale(1.12)', opacity: 1, offset: .28}, {transform: 'translateY(0) scale(1)', opacity: 1}],
  staticJudge: [{opacity: 1}, {opacity: 1}], wash: [{opacity: .18}, {opacity: 0}],
  fade: [{opacity: 1}, {opacity: 0}], fall: [{transform: 'translateY(0) scale(1)'}, {transform: 'translateY(20px) scale(.94)'}],
  holdFade: [{opacity: .7}, {opacity: 0}],
  comboMiss: [{transform: 'scale(.8)', opacity: .35}, {transform: 'scale(1)', opacity: 1}], staticComboMiss: [{opacity: .35}, {opacity: 1}],
  streak: [{transform: 'translateY(8px) scale(.8)', opacity: 0}, {transform: 'translateY(0) scale(1.05)', opacity: 1, offset: .2}, {transform: 'translateY(0) scale(1)', opacity: 1, offset: .7}, {transform: 'translateY(-6px) scale(1)', opacity: 0}],
  staticStreak: [{opacity: 1}, {opacity: 1, offset: .75}, {opacity: 0}],
  comboPop: [{transform: 'scale(1)'}, {transform: 'scale(1.2)', offset: .3}, {transform: 'scale(1)'}],
};
const BURSTS = [1.2, 1, .8, .6].map(strength => ({
  flare: [{transform: 'scaleY(.12)', opacity: .6 * strength}, {transform: 'scaleY(1)', opacity: .24, offset: .35}, {transform: 'scaleY(1.08)', opacity: 0}],
  core: [{transform: 'scale(.5)', opacity: .95}, {transform: `scale(${1.5 * strength})`, opacity: 0}],
  ring: [{transform: 'scale(.25)', opacity: 1}, {transform: `scale(${2.2 * strength})`, opacity: 0}],
  echo: [{transform: 'scale(.3)', opacity: 0}, {transform: 'scale(.6)', opacity: .7, offset: .18}, {transform: `scale(${2.5 * strength})`, opacity: 0}],
  petals: Array.from({length: 6}, (_, i) => {
    const angle = i / 6 * Math.PI * 2, radius = 48 * strength;
    return [{transform: `translate(0,0) rotate(${i * 60}deg) scale(.6)`, opacity: 1}, {transform: `translate(${Math.cos(angle) * radius}px,${Math.sin(angle) * radius - 18}px) rotate(${i * 60}deg) scale(.15)`, opacity: 0}];
  }),
}));
const MISS_FRAGMENTS = Array.from({length: 6}, (_, i) => [{transform: 'translateY(0) rotate(0deg)', opacity: .9}, {transform: `translate(${i % 2 ? 6 : -6}px,${22 + i % 3 * 9}px) rotate(${i % 2 ? 16 : -16}deg) scale(.8)`, opacity: 0}]);
export class HitFeedback {
  constructor(highway, judgement, combo) {
    this.highway = highway; this.judgement = judgement; this.combo = combo;
    this.animations = new Map(); this.cached = new WeakMap(); this.reduced = false;
    this.layer = document.createElement('div'); this.layer.className = 'hit-effects';
    this.layer.setAttribute('aria-hidden', 'true'); highway.append(this.layer);
    this.timing = document.createElement('div'); this.timing.className = 'timing-feedback';
    this.timing.setAttribute('aria-hidden', 'true'); highway.append(this.timing);
    this.banner = document.createElement('div'); this.banner.className = 'streak-feedback';
    this.banner.setAttribute('aria-hidden', 'true'); highway.append(this.banner);
  }
  configure(buttons, reduced) {
    this.reset(); this.buttons = buttons; this.reduced = reduced;
    this.layer.innerHTML = buttons.map((_, lane) => `<div class="lane-effect" style="--lane:${lane}"><i class="lane-flare"></i><i class="hit-ring"></i><i class="hit-ring hit-echo"></i><i class="hit-core"></i>${'<i class="hit-petal"></i>'.repeat(6)}</div>`).join('') + '<div class="miss-wash"></div><div class="miss-fragments">' + '<i></i>'.repeat(6) + '</div>';
    this.lanes = [...this.layer.querySelectorAll('.lane-effect')].map(el => ({ flare: el.querySelector('.lane-flare'), ring: el.querySelector('.hit-ring'), echo: el.querySelector('.hit-echo'), core: el.querySelector('.hit-core'), petals: [...el.querySelectorAll('.hit-petal')] }));
    this.flashes = buttons.map(button => {
      button.querySelector('.receptor-flash')?.remove();
      const flash = document.createElement('i'); flash.className = 'receptor-flash'; flash.setAttribute('aria-hidden', 'true'); button.append(flash); return flash;
    });
    this.wash = this.layer.querySelector('.miss-wash'); this.fragments = [...this.layer.querySelector('.miss-fragments').children];
  }
  animate(element, frames, duration = 280) {
    let cached = this.cached.get(element);
    if (!cached) {
      const animation = element.animate(frames, {duration, easing: 'linear'});
      cached = {animation, frames, duration}; this.cached.set(element, cached);
      animation.onfinish = () => { if (this.animations.get(element) === animation && animation.playState === 'finished') this.animations.delete(element); };
    } else {
      // Restart the same Animation object, even after completion; keep one per target.
      if (cached.frames !== frames) { cached.animation.effect.setKeyframes(frames); cached.frames = frames; }
      if (cached.duration !== duration) { cached.animation.effect.updateTiming({duration}); cached.duration = duration; }
      cached.animation.currentTime = 0; cached.animation.play();
    }
    const animation = cached.animation; this.animations.set(element, animation);
    return animation;
  }
  judge(text, kind, deltaMs = null) {
    this.judgement.textContent = text; this.judgement.dataset.kind = kind;
    this.timing.textContent = kind === 'hit' && Number.isFinite(deltaMs) ? Math.abs(deltaMs) <= 10 ? 'ON BEAT' : `${deltaMs < 0 ? 'EARLY' : 'LATE'} · ${Math.round(Math.abs(deltaMs))} ms` : '';
    this.animate(this.judgement, this.reduced ? FX.staticJudge : FX.judge, 240);
  }
  clearJudge() { this.judgement.textContent = ''; this.timing.textContent = ''; }
  hit(lane, timing = 'Good', complete = false) {
    const button = this.buttons[lane], effect = this.lanes[lane]; if (!button || !effect) return;
    const burst = BURSTS[complete ? 0 : timing === 'Perfect' ? 1 : timing === 'Great' ? 2 : 3];
    this.flashes[lane].dataset.kind = 'hit';
    this.animate(this.flashes[lane], FX.hitFlash, 210);
    if (this.reduced) return;
    this.animate(button, FX.rebound, 230);
    this.animate(effect.flare, burst.flare, 300);
    this.animate(effect.core, burst.core, 150);
    this.animate(effect.ring, burst.ring, 340);
    this.animate(effect.echo, burst.echo, 380);
    for (let i = 0; i < effect.petals.length; i++) this.animate(effect.petals[i], burst.petals[i], 320);
  }

  wrong(lane) {
    const button = this.buttons[lane]; if (!button) return;
    this.flashes[lane].dataset.kind = 'wrong'; this.animate(this.flashes[lane], FX.wrongFlash, 260);
    if (!this.reduced) this.animate(button, FX.shake, 180);
  }
  miss(cue, brokenHold = false) {
    // Entire-register fragments never reveal which correction lane was missed.
    this.animate(this.wash, FX.wash, 220);
    if (!this.reduced) this.fragments.forEach((fragment, i) => this.animate(fragment, MISS_FRAGMENTS[i], 300));
    if (cue?.element) this.animate(cue.element, FX.fade, 280);
    if (cue?.register && !this.reduced) this.animate(cue.register, FX.fall, 280);
    if (brokenHold && cue?.body) this.animate(cue.body, FX.holdFade, 220);
    this.animate(this.combo, this.reduced ? FX.staticComboMiss : FX.comboMiss, 250);
  }
  milestone(combo) {
    this.banner.textContent = `${combo} STREAK`;
    this.animate(this.banner, this.reduced ? FX.staticStreak : FX.streak, 700);
    if (!this.reduced) this.animate(this.combo, FX.comboPop, 340);
  }
  pause(paused) { for (const animation of this.animations.values()) paused ? animation.pause() : animation.play(); }
  reset() { for (const animation of this.animations.values()) animation.cancel(); this.animations.clear(); this.cached = new WeakMap(); this.timing.textContent = ''; this.banner.textContent = ''; }
}
