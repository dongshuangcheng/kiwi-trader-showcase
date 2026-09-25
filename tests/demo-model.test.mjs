import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, advance, duplicateSubmit, reconcile, freshness } from '../docs/demo-model.mjs';
function finish(scenario) { let s = createState(scenario); for (let i=0;i<8;i++) s=advance(s); return s; }
test('normal path records intent before one submission', () => { let s=createState(); for(let i=0;i<3;i++) s=advance(s); assert.equal(s.calls,0); assert.match(s.events.at(-1),/意图/); s=advance(s); assert.equal(s.calls,1); assert.equal(s.status,'acknowledged'); assert.equal(advance(s),s); });
test('transition preserves previous state and events', () => { const before=createState(); const snapshot=structuredClone(before); advance(before); assert.deepEqual(before,snapshot); });
test('timeout remains unknown without invented confirmation', () => { const s=finish('timeout'); assert.equal(s.status,'unknown'); assert.equal(s.calls,1); assert.equal(advance(s),s); });
test('repeated submissions never increase remote submission count', () => { let s=finish('timeout'); for(let i=0;i<100;i++) s=duplicateSubmit(s); assert.equal(s.calls,1); assert.equal(s.duplicateChecks,100); assert.equal(s.status,'unknown'); assert.ok(s.events.length<=9); });
test('reconciliation closes uncertainty without another submission', () => { const s=reconcile(finish('timeout')); assert.equal(s.status,'reconciled'); assert.equal(s.calls,1); assert.equal(reconcile(s),s); });
test('duplicate request after reconciliation preserves final state', () => { const s=duplicateSubmit(reconcile(finish('timeout'))); assert.equal(s.status,'reconciled'); assert.equal(s.calls,1); });
test('stale data blocks before intent and execution', () => { const s=finish('stale'); assert.equal(s.step,2); assert.equal(s.calls,0); assert.equal(s.status,'blocked'); assert.ok(!s.events.some(x=>x.includes('意图已写入'))); });
test('duplicate and reconciliation actions do nothing before submission', () => { const s=createState(); assert.equal(duplicateSubmit(s),s); assert.equal(reconcile(s),s); });
test('new scenario resets progress without sharing events', () => { const old=finish('timeout'); const next=createState('normal'); assert.equal(next.calls,0); assert.equal(next.step,0); assert.notEqual(old.events,next.events); });
test('freshness handles the exact illustrative boundary and invalid inputs', () => { for(const age of [0,15,60]) assert.equal(freshness(age).allowed,true); for(const age of [61,180,-1,NaN,Infinity]) assert.equal(freshness(age).allowed,false); });
test('unknown scenarios are rejected explicitly', () => assert.throws(()=>createState('unexpected')));
