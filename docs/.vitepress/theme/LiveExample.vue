<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import type { ExampleComponent } from './mountExample';

const props = withDefaults(
  defineProps<{
    example: string;
    title: string;
    height?: number;
  }>(),
  { height: 300 },
);

const examples = import.meta.glob<{ default: ExampleComponent }>(
  '../../examples/*.tsx',
);
const sources = import.meta.glob<string>('../../examples/*.tsx', {
  query: '?highlighted',
  import: 'default',
  eager: true,
});
const host = ref<HTMLElement>();
const status = ref<'idle' | 'loading' | 'running'>('idle');
const error = ref('');
const codeShown = ref(false);
const sourceId = `example-source-${useId()}`;
let mounted = false;
let controller: AbortController | undefined;
let dispose: (() => void) | undefined;

function stop() {
  controller?.abort();
  controller = undefined;
  dispose?.();
  dispose = undefined;
  status.value = 'idle';
}

async function run() {
  stop();
  error.value = '';
  const current = new AbortController();
  controller = current;
  status.value = 'loading';

  function fail(cause: unknown) {
    if (current.signal.aborted) return;
    stop();
    error.value = cause instanceof Error ? cause.message : String(cause);
  }

  try {
    const load = examples[`../../examples/${props.example}.tsx`];
    if (!load) throw new Error(`找不到示例：${props.example}`);
    // Import Pixi/Piant only after mounting in the browser, never during SSR.
    const [{ default: component }, { mountExample }] = await Promise.all([
      load(),
      import('./mountExample'),
    ]);
    if (current.signal.aborted || !host.value) return;
    const cleanup = await mountExample(
      host.value,
      component,
      current.signal,
      (cause) => queueMicrotask(() => fail(cause)),
    );
    if (current.signal.aborted) {
      cleanup();
      return;
    }
    dispose = cleanup;
    status.value = 'running';
  } catch (cause) {
    fail(cause);
  }
}

watch(
  () => props.example,
  () => {
    if (mounted) void run();
  },
  { flush: 'post' },
);
onMounted(() => {
  mounted = true;
  void run();
});
onBeforeUnmount(stop);
</script>

<template>
  <section class="live-example" :aria-label="title">
    <div
      class="example-preview"
      :style="{ height: `${height}px` }"
      :aria-busy="status === 'loading'"
    >
      <div
        ref="host"
        class="example-canvas"
        role="img"
        :aria-label="`${title}，在画布中点击交互`"
      />
      <p
        v-if="status !== 'running' && !error"
        class="example-placeholder"
        role="status"
      >
        正在加载示例…
      </p>
    </div>
    <div class="example-toolbar">
      <span class="example-title">{{ title }}</span>
      <div class="example-actions">
        <button
          type="button"
          :aria-expanded="codeShown"
          :aria-controls="sourceId"
          @click="codeShown = !codeShown"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16" />
          </svg>
          {{ codeShown ? '折叠代码' : '展示代码' }}
        </button>
        <button type="button" :disabled="status === 'loading'" @click="run">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 7v5h-5M20 12a8 8 0 1 0-2 5M20 12l-4-4" />
          </svg>
          {{ status === 'loading' ? '加载中…' : '重新运行代码' }}
        </button>
      </div>
    </div>
    <p v-if="error" class="example-error" role="alert">
      示例运行失败：{{ error }}。可以重新运行。
    </p>
    <div
      :id="sourceId"
      v-show="codeShown"
      class="example-source"
      v-html="sources[`../../examples/${example}.tsx`]"
    />
  </section>
</template>

<style scoped>
.live-example {
  margin: 24px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
}
.example-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 48px;
  padding: 8px 12px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}
.example-title {
  color: var(--vp-c-text-2);
  font-size: 13px;
}
.example-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-left: auto;
}
button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 6px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 24px;
  cursor: pointer;
}
button:hover {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}
button svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
button:disabled {
  cursor: wait;
  opacity: 0.6;
}
button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
.example-preview {
  position: relative;
  background: #f8fafc;
}
.example-canvas {
  width: 100%;
  height: 100%;
}
.example-canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
/* Pixi 8.22 positions its DOM layer using viewport offsets. This preview
   already provides the canvas's positioning origin, including on scroll. */
.example-canvas > :deep(div) {
  transform: none !important;
}
.example-placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  margin: 0;
  color: #475569;
  text-align: center;
  pointer-events: none;
}
.example-error {
  padding: 0 16px;
  color: var(--vp-c-danger-1);
}
.example-source {
  border-top: 1px solid var(--vp-c-divider);
}
.example-source :deep(div[class*='language-']) {
  margin: 0;
  border-radius: 0;
}
.example-source :deep(pre) {
  max-height: 440px;
  margin: 0;
  overflow: auto;
}
</style>
