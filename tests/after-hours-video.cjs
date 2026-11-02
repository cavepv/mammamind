// Run with: node tests/after-hours-video.cjs
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const { resolve } = require("node:path");

const html = readFileSync(resolve(__dirname, "../subpages/after-hours.html"), "utf8");
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];

async function checkPlayback(reducedMotion) {
  let onChange;
  const errors = [];
  const video = {
    paused: true,
    muted: false,
    play() { this.paused = false; return Promise.resolve(); },
    pause() { this.paused = true; },
  };
  const motion = {
    matches: reducedMotion,
    addEventListener(event, callback) {
      assert.equal(event, "change");
      onChange = callback;
    },
  };
  runInNewContext(script, {
    document: { querySelector: () => video },
    matchMedia: () => motion,
    console: { error: (...args) => errors.push(args) },
  });
  assert(video.muted);
  assert.equal(video.paused, reducedMotion);
  motion.matches = true;
  onChange();
  assert(video.paused);
  motion.matches = false;
  onChange();
  assert(!video.paused);
  const failure = new Error("Playback blocked");
  video.play = () => Promise.reject(failure);
  onChange();
  await Promise.resolve();
  assert.equal(errors.length, 1);
  assert.equal(errors[0][1], failure);
}

(async () => {
  await checkPlayback(false);
  await checkPlayback(true);
})().catch((error) => { console.error(error); process.exitCode = 1; });
