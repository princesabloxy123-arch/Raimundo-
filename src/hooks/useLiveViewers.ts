import { useEffect, useState } from 'react';

const MIN_VIEWERS = 1;
const MAX_VIEWERS = 100;
const CYCLE_MS = 16000;
const SERIES_LENGTH = 12;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampViewers(n: number): number {
  return Math.min(MAX_VIEWERS, Math.max(MIN_VIEWERS, Math.round(n)));
}

function nextRandomViewerCount(prev: number): number {
  let candidate = randomInt(MIN_VIEWERS, MAX_VIEWERS);
  if (candidate === prev) {
    candidate = prev >= MAX_VIEWERS ? prev - randomInt(3, 18) : clampViewers(prev + randomInt(3, 18));
  }
  return clampViewers(candidate);
}

let currentViewers = randomInt(MIN_VIEWERS, MAX_VIEWERS);
let viewerSeries: number[] = (() => {
  const arr: number[] = [];
  let cursor = randomInt(MIN_VIEWERS, MAX_VIEWERS);
  for (let i = 0; i < SERIES_LENGTH - 1; i += 1) {
    cursor = nextRandomViewerCount(cursor);
    arr.push(cursor);
  }
  arr.push(currentViewers);
  return arr;
})();

const listeners = new Set<() => void>();
let intervalStarted = false;

function notifyAll() {
  listeners.forEach((fn) => fn());
}

function applyRandomChange() {
  currentViewers = nextRandomViewerCount(currentViewers);
  viewerSeries = [...viewerSeries.slice(1), currentViewers];
  notifyAll();
}

function ensureInterval() {
  if (intervalStarted || typeof window === 'undefined') return;
  intervalStarted = true;
  window.setInterval(() => {
    applyRandomChange();
  }, CYCLE_MS);
}

export function triggerViewerEntryBoost() {
  applyRandomChange();
}

export function useLiveViewers() {
  const [, setTick] = useState(0);

  useEffect(() => {
    ensureInterval();
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    liveViewers: currentViewers,
    viewerSeries,
    bumpOnEntry: triggerViewerEntryBoost,
  };
}
