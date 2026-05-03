import { Rive, Fit, Layout, Alignment } from '@rive-app/canvas';
import { RiveTelemetry } from '../../src/index';
import './styles.css';

const stateMachineName = 'State Machine 1';
const runtimeId = 'js-demo-runtime';
const canvas = document.querySelector<HTMLCanvasElement>('#rive-canvas');
const status = document.querySelector<HTMLDivElement>('#status');
const controls = document.querySelector<HTMLDivElement>('#controls');
const refreshButton = document.querySelector<HTMLButtonElement>('#refresh-inputs');
const assetUrl = new URL('../../../demo/assets/demo.riv', import.meta.url).href;

if (!canvas || !status || !controls || !refreshButton) {
  throw new Error('Rive Telemetry JS demo markup is incomplete.');
}

let telemetry: RiveTelemetry | undefined;
let riveInstance: Rive | undefined;

function setStatus(message: string, tone: 'waiting' | 'ready' | 'failed' = 'waiting') {
  status.textContent = message;
  status.dataset.tone = tone;
}

function renderControls() {
  controls.innerHTML = '';
  const inputs = riveInstance?.stateMachineInputs(stateMachineName) ?? [];

  if (inputs.length === 0) {
    controls.innerHTML = '<p class="empty">No inputs reported by this state machine.</p>';
    return;
  }

  for (const input of inputs) {
    const card = document.createElement('article');
    card.className = 'input-card';

    const title = document.createElement('div');
    title.className = 'input-title';
    title.textContent = input.name;
    card.append(title);

    if (typeof input.value === 'boolean') {
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = input.value;
      toggle.addEventListener('change', () => {
        input.value = toggle.checked;
        renderControls();
      });
      card.append(toggle);
    } else if (typeof input.value === 'number') {
      const row = document.createElement('div');
      row.className = 'number-row';

      const decrement = document.createElement('button');
      decrement.type = 'button';
      decrement.textContent = '-';
      decrement.addEventListener('click', () => {
        input.value = Number(input.value ?? 0) - 1;
        renderControls();
      });

      const value = document.createElement('input');
      value.type = 'number';
      value.value = String(input.value);
      value.addEventListener('change', () => {
        input.value = Number(value.value);
        renderControls();
      });

      const increment = document.createElement('button');
      increment.type = 'button';
      increment.textContent = '+';
      increment.addEventListener('click', () => {
        input.value = Number(input.value ?? 0) + 1;
        renderControls();
      });

      row.append(decrement, value, increment);
      card.append(row);
    } else if (typeof input.fire === 'function') {
      const fire = document.createElement('button');
      fire.type = 'button';
      fire.textContent = 'Fire';
      fire.addEventListener('click', () => {
        input.fire();
      });
      card.append(fire);
    } else {
      const unsupported = document.createElement('p');
      unsupported.className = 'empty';
      unsupported.textContent = 'Unsupported input';
      card.append(unsupported);
    }

    controls.append(card);
  }
}

riveInstance = new Rive({
  src: assetUrl,
  canvas,
  autoplay: true,
  stateMachines: stateMachineName,
  layout: new Layout({
    fit: Fit.Contain,
    alignment: Alignment.Center,
  }),
  onLoad: () => {
    riveInstance?.resizeDrawingSurfaceToCanvas();
    telemetry = new RiveTelemetry({
      rive: riveInstance,
      runtimeId,
      label: 'JavaScript Demo',
      stateMachineName,
      source: 'js-demo',
      debug: true,
    });
    telemetry.start();
    renderControls();
    setStatus('Streaming telemetry to VS Code', 'ready');
  },
  onLoadError: () => {
    setStatus('Failed to load Rive asset', 'failed');
  },
});

refreshButton.addEventListener('click', renderControls);

window.addEventListener('resize', () => {
  riveInstance?.resizeDrawingSurfaceToCanvas();
});

window.addEventListener('beforeunload', () => {
  telemetry?.dispose();
  riveInstance?.cleanup();
});
