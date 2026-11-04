import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output =
  process.env.COLLECTIONS_EVIDENCE_DIR ?? '/tmp/piant-cod172/benchmark';
const mode = process.env.COLLECTIONS_BENCHMARK_MODE ?? 'baseline';
const modes = mode === 'both' ? ['baseline', 'virtual'] : [mode];
const count = Number(process.env.COLLECTIONS_ROWS ?? 10000);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
const results = [];
const percentile = (values, fraction) =>
  [...values].sort((a, b) => a - b)[
    Math.min(values.length - 1, Math.ceil(values.length * fraction) - 1)
  ];
try {
  await page.goto(
    process.env.COLLECTIONS_BENCHMARK_URL ??
      'http://127.0.0.1:4177/collectionsBenchmark.html',
  );
  await page.waitForFunction(() => Boolean(window.collectionsBenchmark));
  for (const entry of modes) {
    if (results.length) {
      await page.reload();
      await page.waitForFunction(() => Boolean(window.collectionsBenchmark));
    }
    const mounted = await page.evaluate(
      ({ entry, count }) => window.collectionsBenchmark.start(entry, count),
      { entry, count },
    );
    const scrolling = await page.evaluate(() =>
      window.collectionsBenchmark.sample(),
    );
    const cleanup = await page.evaluate(() =>
      window.collectionsBenchmark.stop(),
    );
    const summary = {
      workMedianMs: percentile(
        scrolling.timings.map((sample) => sample.workMs),
        0.5,
      ),
      workP95Ms: percentile(
        scrolling.timings.map((sample) => sample.workMs),
        0.95,
      ),
      frameMedianMs: percentile(
        scrolling.timings.map((sample) => sample.frameMs),
        0.5,
      ),
      frameP95Ms: percentile(
        scrolling.timings.map((sample) => sample.frameMs),
        0.95,
      ),
      targetFrameBudgetMs: 16.7,
      comparisonToleranceMs: 1e-9,
      maxSampledLiveRows: Math.max(
        ...scrolling.timings.map((sample) => sample.live),
      ),
      maxConstructedUndisposedRows: scrolling.maxLive,
      maxSampledNodeCount: Math.max(
        ...scrolling.timings.map((sample) => sample.nodeCount),
      ),
    };
    summary.frameBudgetMet =
      summary.frameP95Ms <=
      summary.targetFrameBudgetMs + summary.comparisonToleranceMs;
    const result = {
      mode: entry,
      browserVersion: browser.version(),
      capturedAt: new Date().toISOString(),
      methodology:
        'One fresh page and mounted scene per mode; same 640x320 viewport, fixed32px View+Text rows, 10 warmup and90 sampled requestAnimationFrame intervals; jump forward37 rows per frame via public scroll methods, synchronous root.doLayout+app.render measured as workMs; RAF intervals include rendering/scheduling. Headless Chrome, no CPU throttling. Timing includes machine noise;16.7ms is a measured target, not an assertion. maxLive counts constructed yet undisposed row children, including brief incoming/outgoing For reconciliation overlap; sample live counts post-render windows.',
      mounted,
      scrolling,
      summary,
      cleanup,
      errors: [...errors],
    };
    results.push(result);
    await writeFile(
      `${output}/${entry}-${count}.json`,
      `${JSON.stringify(result, null, 2)}\n`,
    );
    if (entry === 'virtual') {
      const activeBound = Math.ceil(320 / 32) + 2 * 2 + 2;
      assert.ok(
        mounted.live <= activeBound,
        'initial live row count bounded by viewport',
      );
      assert.ok(
        scrolling.timings.every((sample) => sample.live <= activeBound),
        'all sampled live row counts bounded',
      );
      assert.ok(
        mounted.created <= activeBound,
        'initial factory count excludes full collection construction',
      );
      assert.ok(
        scrolling.created <=
          activeBound * (scrolling.frames + scrolling.warmup + 1),
        'total factory count bounded by visited windows',
      );
    }
    assert.equal(cleanup.live, 0, 'all constructed rows destroyed');
    assert.equal(cleanup.retainedRows, 0, 'no retained rows');
    console.log(JSON.stringify({ mode: entry, mounted, summary, cleanup }));
  }
  assert.deepEqual(errors, [], 'no browser runtime errors');
} finally {
  await writeFile(
    `${output}/run-${mode}-${count}.json`,
    `${JSON.stringify({ results, errors }, null, 2)}\n`,
  );
  await browser.close();
}
