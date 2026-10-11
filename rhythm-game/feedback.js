// A fixed set of lane effects: no DOM allocation, layout reads or timers per hit.
export class HitFeedback {
  constructor(highway, judgement, combo) {
    this.highway = highway; this.judgement = judgement; this.combo = combo;
    this.animations = new Map(); this.reduced = false;
    this.layer = document.createElement('div'); this.layer.className = 'hit-effects';
    this.layer.setAttribute('aria-hidden', 'true'); highway.append(this.layer);
  }
  configure(buttons, reduced) {
    this.reset(); this.buttons = buttons; this.reduced = reduced;
    this.layer.innerHTML = buttons.map((_, lane) => `<div class="lane-effect" style="--lane:${lane}"><i class="hit-ring"></i>${Array.from({length: 6}, () => '<i class="hit-petal"></i>').join('')}</div>`).join('') + '<div class="miss-fragments">' + '<i></i>'.repeat(6) + '</div>';
    this.lanes = [...this.layer.querySelectorAll('.lane-effect')].map(el => ({ ring: el.firstElementChild, petals: [...el.querySelectorAll('.hit-petal')] }));
    this.fragments = [...this.layer.querySelector('.miss-fragments').children];
  }
  animate(element, frames, duration = 280) {
    this.animations.get(element)?.cancel();
    const animation = element.animate(frames, { duration, easing: 'ease-out' });
    this.animations.set(element, animation);
    animation.onfinish = () => { if (this.animations.get(element) === animation) this.animations.delete(element); };
  }
  judge(text, kind) {
    this.judgement.textContent = text; this.judgement.dataset.kind = kind;
    this.animate(this.judgement, this.reduced ? [{opacity: 1}, {opacity: 1}] : [{transform: 'translateY(5px) scale(.92)', opacity: .6}, {transform: 'translateY(0) scale(1)', opacity: 1}], 180);
  }
  hit(lane, timing = 'Good', complete = false) {
    const button = this.buttons[lane], effect = this.lanes[lane]; if (!button || !effect) return;
    const strong = timing === 'Perfect' || complete;
    this.animate(button, this.reduced ? [{background: '#dceb55'}, {background: '#101c28'}] : [{transform: 'translateY(4px) scale(.94)', background: '#dceb55'}, {transform: 'translateY(-2px) scale(1.03)', offset: .5}, {transform: 'translateY(0) scale(1)'}], 220);
    if (this.reduced) return;
    this.animate(effect.ring, [{transform: 'scale(.35)', opacity: .9}, {transform: `scale(${strong ? 1.7 : 1.2})`, opacity: 0}], strong ? 340 : 260);
    effect.petals.forEach((petal, i) => {
      const angle = (i / 6) * Math.PI * 2, radius = strong ? 38 : 24;
      this.animate(petal, [{transform: 'translate(0,0) scale(.6)', opacity: .9}, {transform: `translate(${Math.cos(angle) * radius}px,${Math.sin(angle) * radius - 12}px) rotate(${i * 60}deg) scale(.3)`, opacity: 0}], strong ? 340 : 260);
    });
  }
  wrong(lane) {
    const button = this.buttons[lane]; if (!button) return;
    this.animate(button, [{background: '#382431', borderColor: '#ff8b9c'}, {background: '#101c28', borderColor: '#415569'}], 300);
  }
  miss(cue, brokenHold = false) {
    // Neutral fragments span the whole register; never reveal a solution lane.
    if (!this.reduced) this.fragments.forEach((fragment, i) => this.animate(fragment, [{transform: 'translateY(0) rotate(0deg)', opacity: .9}, {transform: `translateY(${18 + i % 3 * 8}px) rotate(${i % 2 ? 12 : -12}deg)`, opacity: 0}], 300));
    const register = cue?.register;
    if (register) this.animate(register, this.reduced ? [{opacity: .7}, {opacity: 0}] : [{opacity: .8, transform: 'translateY(0)'}, {opacity: 0, transform: 'translateY(18px) scale(.96)'}], 280);
    if (brokenHold && cue?.body) this.animate(cue.body, [{opacity: .7}, {opacity: 0}], 220);
    this.animate(this.combo, this.reduced ? [{opacity: .35}, {opacity: 1}] : [{transform: 'scale(.86)', opacity: .35}, {transform: 'scale(1)', opacity: 1}], 250);
  }
  milestone() {
    this.animate(this.combo, this.reduced ? [{opacity: 1}, {opacity: 1}] : [{transform: 'scale(1)'}, {transform: 'scale(1.12)', offset: .4}, {transform: 'scale(1)'}], 340);
  }
  pause(paused) { for (const animation of this.animations.values()) paused ? animation.pause() : animation.play(); }
  reset() { for (const animation of this.animations.values()) animation.cancel(); this.animations.clear(); }
}
