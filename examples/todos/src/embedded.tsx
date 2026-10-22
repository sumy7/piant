import {
  createState,
  Input,
  type MountedApp,
  mount,
  Text,
  View,
} from '@piant/core';
import './embedded.css';

document.title = 'Piant · Embedded canvas instances';
document.body.innerHTML = `
  <main>
    <a href="/">Todos example</a>
    <h1>Two independent embedded canvases</h1>
    <p>Click and type in each instance. Resize, destroy, or rebuild one while the other stays active.</p>
    <p>Scroll this page and the framed area below to check canvas pointer and DOM input alignment.</p>
    <div class="page-spacer">Ordinary page content above the canvases ↓</div>
    <div class="scroll-area" aria-label="Scrollable canvas examples">
      <div class="scroll-content">
        <div class="scroll-spacer">Scrollable parent content ↓</div>
        <div class="panels">
          <section aria-labelledby="left-title">
            <h2 id="left-title">Left · existing canvas</h2>
            <div class="controls">
              <button id="left-size" type="button">Shrink left</button>
              <button id="left-lifecycle" type="button">Destroy left</button>
            </div>
            <p id="left-status" class="status" role="status">Starting…</p>
            <p id="left-state" class="state"></p>
            <div id="left-host" class="canvas-host left-host"><canvas id="left-canvas" width="240" height="160" aria-label="Left canvas"></canvas></div>
          </section>
          <section aria-labelledby="right-title">
            <h2 id="right-title">Right · container target</h2>
            <div class="controls">
              <button id="right-size" type="button">Shrink right</button>
              <button id="right-lifecycle" type="button">Destroy right</button>
            </div>
            <p id="right-status" class="status" role="status">Starting…</p>
            <p id="right-state" class="state"></p>
            <div id="right-host" class="canvas-host right-host"></div>
          </section>
        </div>
        <p class="scroll-footer">Both hosts have borders, padding, and a positioned parent. Rebuild resets only that instance.</p>
      </div>
    </div>
    <p class="page-footer">Ordinary page content below the canvases</p>
  </main>
`;

function element<T extends HTMLElement>(id: string) {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing example element: ${id}`);
  return found as T;
}

function createPanel(side: 'left' | 'right', color: string) {
  const host = element<HTMLDivElement>(`${side}-host`);
  const existingCanvas =
    side === 'left' ? element<HTMLCanvasElement>('left-canvas') : undefined;
  const status = element<HTMLParagraphElement>(`${side}-status`);
  const state = element<HTMLParagraphElement>(`${side}-state`);
  const sizeButton = element<HTMLButtonElement>(`${side}-size`);
  const lifecycleButton = element<HTMLButtonElement>(`${side}-lifecycle`);
  let instance: MountedApp | undefined;

  function Counter() {
    const [count, setCount] = createState(0);
    const [value, setValue] = createState(`${side} input`);
    const countLabel = () => `${side}: ${count()} clicks`;
    const inputLabel = () => `Input: ${value()}`;
    const report = () => {
      state.textContent = `${side}: ${count()} clicks · ${value()}`;
    };
    report();

    return (
      <View
        style={{
          width: '100%',
          height: '100%',
          padding: 18,
          gap: 16,
          backgroundColor: '#f8fafc',
        }}
      >
        <Text style={{ fontSize: 21, color }}>{countLabel}</Text>
        <View
          style={{
            height: 48,
            backgroundColor: color,
            borderRadius: 6,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onClick={() => {
            setCount(count() + 1);
            report();
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 18 }}>Increment</Text>
        </View>
        <Input
          value={value()}
          onInput={(next) => {
            setValue(next);
            report();
          }}
          style={{
            height: 44,
            padding: 10,
            backgroundColor: '#e2e8f0',
            borderRadius: 6,
          }}
        />
        <Text style={{ fontSize: 16, color: '#334155' }}>{inputLabel}</Text>
      </View>
    );
  }

  async function start() {
    lifecycleButton.disabled = true;
    try {
      instance = await mount(
        Counter,
        existingCanvas ?? host,
        side === 'left' ? { resolution: 2 } : undefined,
      );
      const mounted = instance;
      const updateStatus = () => {
        status.textContent = `Running · ${mounted.app.screen.width} × ${mounted.app.screen.height} logical · CSS ${mounted.canvas.clientWidth} × ${mounted.canvas.clientHeight} · buffer ${mounted.canvas.width} × ${mounted.canvas.height} · resolution ${mounted.app.renderer.resolution}`;
      };
      mounted.app.renderer.on('resize', updateStatus);
      updateStatus();
      lifecycleButton.textContent = `Destroy ${side}`;
    } catch (error) {
      status.textContent = `Failed: ${String(error)}`;
      lifecycleButton.textContent = `Rebuild ${side}`;
    } finally {
      lifecycleButton.disabled = false;
    }
  }

  sizeButton.addEventListener('click', () => {
    const small = host.classList.toggle('small');
    sizeButton.textContent = `${small ? 'Enlarge' : 'Shrink'} ${side}`;
  });
  lifecycleButton.addEventListener('click', () => {
    if (instance && !instance.isDestroyed) {
      instance.destroy();
      instance = undefined;
      status.textContent = existingCanvas
        ? 'Destroyed · original canvas retained (240 × 160 attributes restored)'
        : 'Destroyed · library canvas removed';
      lifecycleButton.textContent = `Rebuild ${side}`;
    } else {
      void start();
    }
  });
  return start();
}

void Promise.all([
  createPanel('left', '#1d4ed8'),
  createPanel('right', '#0f766e'),
]);
