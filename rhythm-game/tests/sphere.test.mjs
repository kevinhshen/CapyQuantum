import test from 'node:test';
import assert from 'node:assert/strict';
import { projectBlochPoint, BlochSphere } from '../sphere.js';

test('rotating view preserves a pure state on the unit sphere and fixes the poles', () => {
  const north = projectBlochPoint([0,0,1], 0), south = projectBlochPoint([0,0,-1], 0);
  for (let angle = 0; angle < Math.PI * 2; angle += .17) {
    assert.deepEqual(projectBlochPoint([0,0,1], angle), north);
    assert.deepEqual(projectBlochPoint([0,0,-1], angle), south);
    const p = projectBlochPoint([.6,0,.8], angle);
    const radius = ((p.x - 260) / 143) ** 2 + ((p.y - 198) / 143) ** 2 + p.depth ** 2;
    assert.ok(Math.abs(radius - 1) < 1e-12);
  }
});

test('sphere respects pause, reduced motion, and hidden menus, then resumes', () => {
  const element = () => ({attrs:{},dataset:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this[k]=fn;}});
  const nodes = new Map(), svg = element(), toggle = element();
  svg.querySelector = selector => {if (!nodes.has(selector)) nodes.set(selector,element()); return nodes.get(selector);};
  const sphere = new BlochSphere(svg,toggle), vector = svg.querySelector('[data-vector]');
  const initial = vector.attrs.d;
  sphere.frame(.05,false,false); assert.equal(vector.attrs.d, initial);
  sphere.frame(.05,true,true); assert.equal(vector.attrs.d, initial); assert.equal(toggle.disabled,true);
  sphere.frame(.05,false,true); assert.notEqual(vector.attrs.d, initial); assert.equal(toggle.disabled,false);
  toggle.click(); const paused = vector.attrs.d;
  sphere.frame(.05,false,true); assert.equal(vector.attrs.d, paused); assert.equal(toggle.textContent,'Resume rotation');
  toggle.click(); sphere.frame(.05,false,true); assert.notEqual(vector.attrs.d,paused);
});
