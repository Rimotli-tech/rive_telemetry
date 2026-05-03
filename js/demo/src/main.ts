import { Rive, Fit, Layout, Alignment } from '@rive-app/canvas';
import { RiveTelemetry } from '../../src/index';
import './styles.css';

const stateMachineName = 'State Machine 1';
const runtimeGrid = document.querySelector<HTMLDivElement>('#runtime-grid');
const status = document.querySelector<HTMLDivElement>('#status');

const runtimeConfigs = [
  {
    assetUrl: new URL('../../../demo/assets/demo.riv', import.meta.url).href,
    runtimeId: 'js-demo-runtime-demo',
    label: 'JavaScript Demo - demo.riv',
  },
  {
    assetUrl: new URL('../../../demo/assets/demo_2.riv', import.meta.url).href,
    runtimeId: 'js-demo-runtime-demo-2',
    label: 'JavaScript Demo - demo_2.riv',
    viewModelName: 'CatViewModel',
    viewModelInstanceName: 'catVMInstance',
  },
];

interface RuntimeView {
  card: HTMLElement;
  config: (typeof runtimeConfigs)[number];
  canvas: HTMLCanvasElement;
  controls: HTMLDivElement;
  state: HTMLDivElement;
  telemetry?: RiveTelemetry;
  rive?: Rive;
}

if (!runtimeGrid || !status) {
  throw new Error('Rive Telemetry JS demo markup is incomplete.');
}

const runtimeViews = runtimeConfigs.map(createRuntimeView);
runtimeViews.forEach((view) => runtimeGrid.append(view.card));
runtimeViews.forEach(startRuntime);

function createRuntimeView(config: (typeof runtimeConfigs)[number]): RuntimeView {
  const card = document.createElement('article');
  card.className = 'runtime-card';

  const header = document.createElement('div');
  header.className = 'runtime-header';

  const title = document.createElement('h2');
  title.textContent = config.label;

  const state = document.createElement('div');
  state.className = 'runtime-state';
  state.textContent = 'Loading';

  header.append(title, state);

  const stage = document.createElement('div');
  stage.className = 'stage';

  const canvas = document.createElement('canvas');
  stage.append(canvas);

  const controlsHeader = document.createElement('div');
  controlsHeader.className = 'section-header';

  const controlsTitle = document.createElement('h3');
  controlsTitle.textContent = 'Local Inputs';

  const refreshButton = document.createElement('button');
  refreshButton.type = 'button';
  refreshButton.textContent = 'Refresh';

  controlsHeader.append(controlsTitle, refreshButton);

  const controls = document.createElement('div');
  controls.className = 'controls';

  card.append(header, stage, controlsHeader, controls);

  const view = { card, config, canvas, controls, state };
  refreshButton.addEventListener('click', () => renderControls(view));

  return view;
}

function startRuntime(view: RuntimeView) {
  view.rive = new Rive({
    src: view.config.assetUrl,
    canvas: view.canvas,
    autoplay: true,
    stateMachines: stateMachineName,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
    onLoad: () => {
      view.rive?.resizeDrawingSurfaceToCanvas();
      const viewModelInstance = bindConfiguredViewModel(view);
      view.telemetry = new RiveTelemetry({
        rive: view.rive,
        runtimeId: view.config.runtimeId,
        label: view.config.label,
        stateMachineName,
        source: 'js-demo',
        viewModelName: view.config.viewModelName,
        viewModelInstanceName: view.config.viewModelInstanceName,
        viewModelInstance,
        debug: true,
      });
      view.telemetry.start();
      renderControls(view);
      setRuntimeState(view, 'Streaming', 'ready');
      updatePageStatus();
    },
    onLoadError: () => {
      setRuntimeState(view, 'Failed', 'failed');
      updatePageStatus();
    },
  });
}

function bindConfiguredViewModel(view: RuntimeView): unknown {
  const { viewModelName, viewModelInstanceName } = view.config;
  const rive = view.rive;
  if (!rive || !viewModelName) {
    return undefined;
  }

  const viewModel = rive.viewModelByName(viewModelName);
  if (!viewModel) {
    return undefined;
  }

  const instance =
    viewModelInstanceName !== undefined
      ? viewModel.instanceByName(viewModelInstanceName)
      : viewModel.defaultInstance() ?? viewModel.instance();

  if (instance) {
    rive.bindViewModelInstance(instance);
  }

  return instance ?? undefined;
}

function setRuntimeState(
  view: RuntimeView,
  message: string,
  tone: 'waiting' | 'ready' | 'failed' = 'waiting',
) {
  view.state.textContent = message;
  view.state.dataset.tone = tone;
}

function updatePageStatus() {
  const readyCount = runtimeViews.filter(
    (view) => view.state.dataset.tone === 'ready',
  ).length;

  if (readyCount === runtimeViews.length) {
    status.textContent = 'Streaming two runtimes to VS Code';
    status.dataset.tone = 'ready';
    return;
  }

  if (runtimeViews.some((view) => view.state.dataset.tone === 'failed')) {
    status.textContent = 'One or more runtimes failed to load';
    status.dataset.tone = 'failed';
  }
}

function renderControls(view: RuntimeView) {
  view.controls.innerHTML = '';
  const inputs = view.rive?.stateMachineInputs(stateMachineName) ?? [];

  if (inputs.length === 0) {
    view.controls.innerHTML =
      '<p class="empty">No inputs reported by this state machine.</p>';
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
        renderControls(view);
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
        renderControls(view);
      });

      const value = document.createElement('input');
      value.type = 'number';
      value.value = String(input.value);
      value.addEventListener('change', () => {
        input.value = Number(value.value);
        renderControls(view);
      });

      const increment = document.createElement('button');
      increment.type = 'button';
      increment.textContent = '+';
      increment.addEventListener('click', () => {
        input.value = Number(input.value ?? 0) + 1;
        renderControls(view);
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

    view.controls.append(card);
  }
}

window.addEventListener('resize', () => {
  runtimeViews.forEach((view) => view.rive?.resizeDrawingSurfaceToCanvas());
});

window.addEventListener('beforeunload', () => {
  runtimeViews.forEach((view) => {
    view.telemetry?.dispose();
    view.rive?.cleanup();
  });
});
