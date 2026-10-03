import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUniverse } from '../src/core/universe.ts';
import { generateSystem } from '../src/gameplay/systems.ts';
import { catchUp } from '../src/simulation/offline-client.ts';
import type { CatchUpWorker } from '../src/simulation/offline-client.ts';
import { resumeOffline } from '../src/simulation/engine.ts';
import type { Universe } from '../src/core/types.ts';

class TestWorker implements CatchUpWorker {
  onmessage: Worker['onmessage'] = null;
  onerror: Worker['onerror'] = null;
  onmessageerror: Worker['onmessageerror'] = null;
  terminated = 0;
  posts = 0;
  mode: 'success' | 'error' | 'decode' | 'send' | 'hang' | 'simulation' | 'malformed' | 'invalid' | 'time' = 'success';
  postMessage(message: unknown): void {
    this.posts++;
    if (this.mode === 'send') throw new Error('Message could not be sent.');
    if (this.mode === 'hang') return;
    queueMicrotask(() => {
      const target = this as unknown as Worker;
      if (this.mode === 'error') { this.onerror?.call(target, { preventDefault() {} } as ErrorEvent); return; }
      if (this.mode === 'decode') { this.onmessageerror?.call(target, new MessageEvent('messageerror')); return; }
      const request = structuredClone(message) as { state: Universe; timestamp: number };
      let data: unknown;
      if (this.mode === 'simulation') data = { error: 'The simulated universe is invalid.' };
      else if (this.mode === 'malformed') data = { state: request.state };
      else {
        const result = resumeOffline(request.state, request.timestamp);
        if (this.mode === 'invalid') request.state.resources.energy = -1;
        if (this.mode === 'time') result.seconds++;
        data = { state: request.state, result };
      }
      this.onmessage?.call(target, new MessageEvent('message', { data }));
    });
  }
  terminate(): void { this.terminated++; }
}

function largeUniverse() {
  const state = createUniverse(41, 0); for (let i = 0; i < 9; i++) generateSystem(state, i);
  return state;
}

test('worker success matches inline catch-up and releases all worker handlers', async () => {
  const source = largeUniverse(), original = structuredClone(source), worker = new TestWorker();
  const actual = await catchUp(source, 3600000, { createWorker: () => worker }), expected = await catchUp(source, 3600000);
  assert.deepEqual(actual, expected); assert.deepEqual(source, original);
  assert.equal(worker.posts, 1); assert.equal(worker.terminated, 1);
  assert.equal(worker.onmessage, null); assert.equal(worker.onerror, null); assert.equal(worker.onmessageerror, null);
});

test('worker construction, loading, decoding and sending failures recover from the original state', async () => {
  const source = largeUniverse(), original = structuredClone(source), expected = await catchUp(source, 3600000);
  assert.deepEqual(await catchUp(source, 3600000, { createWorker: () => { throw new Error('Workers are unavailable.'); } }), expected);
  for (const mode of ['error', 'decode', 'send'] as const) {
    const worker = new TestWorker(); worker.mode = mode;
    assert.deepEqual(await catchUp(source, 3600000, { createWorker: () => worker }), expected);
    assert.equal(worker.terminated, 1); assert.equal(worker.onmessage, null);
  }
  assert.deepEqual(source, original);
});

test('a stalled worker times out, recovers once and ignores late replies', async () => {
  const source = largeUniverse(), worker = new TestWorker(); worker.mode = 'hang';
  const pending = catchUp(source, 3600000, { createWorker: () => worker, workerTimeoutMs: 5 });
  const late = worker.onmessage!;
  const actual = await pending;
  late.call(worker as unknown as Worker, new MessageEvent('message', { data: { error: 'A late reply' } }));
  assert.deepEqual(actual, await catchUp(source, 3600000)); assert.equal(worker.terminated, 1);
});

test('simulation errors and malformed worker results reject atomically instead of hanging', async () => {
  const source = largeUniverse(), original = structuredClone(source);
  for (const mode of ['simulation', 'malformed', 'invalid', 'time'] as const) {
    const worker = new TestWorker(); worker.mode = mode;
    await assert.rejects(catchUp(source, 3600000, { createWorker: () => worker }), /invalid|incomplete|inconsistent/i);
    assert.equal(worker.terminated, 1); assert.equal(worker.onmessage, null); assert.deepEqual(source, original);
  }
});

test('invalid timestamps and invalid source states never reach a worker or alter the source', async () => {
  const source = largeUniverse(), original = structuredClone(source);
  let calls = 0; const createWorker = () => { calls++; return new TestWorker(); };
  for (const timestamp of [NaN, Infinity, -1]) {
    await assert.rejects(catchUp(source, timestamp, { createWorker }), /timestamp/);
    assert.throws(() => resumeOffline(source, timestamp), /timestamp/);
  }
  assert.deepEqual(source, original); source.resources.energy = -1;
  await assert.rejects(catchUp(source, 3600000, { createWorker }), /resource balance/); assert.equal(calls, 0);
});

test('worker cap and rollback results match the same clock rules as inline returns', async () => {
  const source = largeUniverse(), worker = new TestWorker();
  const capped = await catchUp(source, 172800000, { createWorker: () => worker });
  assert.equal(capped.result.seconds, 86400); assert.equal(capped.result.capped, true);
  const repeated = await catchUp(capped.state, 172800000);
  assert.equal(repeated.result.seconds, 0); assert.equal(repeated.state.time, 86400);
  const rollback = await catchUp(capped.state, 1000);
  assert.equal(rollback.result.seconds, 0); assert.equal(rollback.state.lastTimestamp, 172800000);
});
