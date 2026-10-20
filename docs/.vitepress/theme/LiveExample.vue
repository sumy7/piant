<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
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
  query: '?raw',
  import: 'default',
  eager: true,
});
const host = ref<HTMLElement>();
const status = ref<'idle' | 'loading' | 'running'>('idle');
const error = ref('');
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
    // Import Pixi/Piant only after a browser interaction, never during SSR.
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
    stop();
    error.value = '';
  },
);
onBeforeUnmount(stop);
</script>

<template>
  <section class="live-example" :aria-label="title">
    <div class="example-toolbar">
      <strong>{{ title }}</strong>
      <div class="example-actions">
        <button type="button" :disabled="status === 'loading'" @click="run">
          {{
            status === 'loading'
              ? '加载中…'
              : status === 'running'
                ? '重新运行'
                : '运行示例'
          }}
        </button>
        <button v-if="status !== 'idle'" type="button" @click="stop">
          停止
        </button>
      </div>
    </div>
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
      <p v-if="status !== 'running'" class="example-placeholder" role="status">
        {{
          status === 'loading'
            ? '正在加载示例…'
            : '点击「运行示例」，在此体验交互效果。'
        }}
      </p>
    </div>
    <p v-if="error" class="example-error" role="alert">
      示例运行失败：{{ error }}。可以重新运行。
    </p>
    <details class="example-source">
      <summary>查看示例源码</summary>
      <pre><code>{{ sources[`../../examples/${example}.tsx`] }}</code></pre>
    </details>
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
  gap: 12px;
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
}
.example-actions {
  display: flex;
  gap: 8px;
}
button {
  padding: 4px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-brand-1);
  cursor: pointer;
}
button:hover {
  border-color: var(--vp-c-brand-1);
}
button:disabled {
  cursor: wait;
  opacity: 0.6;
}
button:focus-visible,
summary:focus-visible {
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
  padding: 12px 16px;
  border-top: 1px solid var(--vp-c-divider);
}
summary {
  cursor: pointer;
}
.example-source pre {
  margin-bottom: 0;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.6;
}
</style>
