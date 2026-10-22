# Element switching frame regression

From the repository root, start the existing browser fixture server:

```sh
pnpm --dir docs exec vite --config ../packages/core/browser-tests/vite.config.mjs
```

Open `http://127.0.0.1:4176/elementSwitch.html?case=dynamic` in a WebGL-capable browser. Repeat with `show`, `switch`, `transition-out-in`, `transition-in-out`, and `transition-parallel`. The three card sizes and colors make missing content and incorrect geometry observable. Transition callbacks complete on animation frames; retained outgoing cards are included in the expected overlap.

Click **Switch element**, then exercise consecutive changes in the console:

```js
const nextFrame = () => new Promise(requestAnimationFrame);
for (let burst = 0; burst < 8; burst++) {
  for (let change = 0; change < 5; change++) fixture.toggle();
  for (let frame = 0; frame < 4; frame++) await nextFrame();
}
```

Verify drawing independently of the shared layout ticker:

```js
fixture.manual();
for (let change = 0; change < 12; change++) {
  fixture.lateUpdate();
  for (let frame = 0; frame < 4; frame++) {
    await nextFrame();
    fixture.draw();
  }
}
console.table(fixture.frames.filter((frame) => !frame.ok)); // Expected: no rows.
```

The fixture samples every actual application draw by copying its framebuffer immediately after `renderer.render`. It compares all 320 × 200 pixels with the declared rectangles, using the logical branch order for transitions. It does not perform an extra render to extract pixels. `fixture.frames` retains the sequence, revision, dirty flag, center pixel, and mismatch count; `fixture.screenshots` retains successful frames from the first four revisions and up to three failing PNG data URLs. A white center where a colored card belongs is a blank frame, even if a later screenshot looks correct.

This covers ordinary, uncached WebGL rendering through the container passed to `PRoot`, with Pixi's default independent application ticker. Cached textures, application culling, replacing the host's `onRender`, and rendering an internal subtree directly require their own integration checks. The existing shared layout ticker remains active; a clean draw does not repeat Yoga layout. Use `fixture.destroy()` to release the fixture.
