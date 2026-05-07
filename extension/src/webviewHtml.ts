import * as vscode from 'vscode';
import {
  RiveTelemetryPanelState,
  RiveTelemetryServerStatus,
} from './types';

export function getWebviewHtml(
  state: RiveTelemetryPanelState,
  status: RiveTelemetryServerStatus,
  iconUri: vscode.Uri,
  cspSource: string,
): string {
  const nonce = createNonce();
  const initialState = JSON.stringify(state);
  const initialStatus = JSON.stringify(status);
  const brandIcon = JSON.stringify(iconUri.toString());

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https: data:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RiveTelemetry</title>
  <style>
    :root {
      --rt-background: #0b1218;
      --rt-surface: #121920;
      --rt-surface-low: #0e151b;
      --rt-surface-control: #1a232b;
      --rt-surface-control-hover: #25303a;
      --rt-border: #404751;
      --rt-border-soft: rgba(64, 71, 81, 0.48);
      --rt-text: #dae3ee;
      --rt-muted: #c0c7d3;
      --rt-muted-soft: rgba(192, 199, 211, 0.7);
      --rt-primary: #9fcaff;
      --rt-green: #22c55e;
      --rt-yellow: #facc15;
      --rt-red: #ffb4ab;
      --rt-radius: 6px;
      --rt-font: var(--vscode-font-family, "Public Sans", "Inter", system-ui, sans-serif);
      --rt-mono: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
    }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--rt-background);
      color: var(--rt-text);
      font-family: var(--rt-font);
      font-size: 13px;
      -webkit-font-smoothing: antialiased;
    }
    h1, h2, h3, p {
      margin: 0;
    }
    code {
      font-family: var(--rt-mono);
    }
    .layout {
      width: min(960px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 24px 0;
    }
    .app-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--rt-border-soft);
    }
    .header-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      flex-wrap: wrap;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--rt-text);
      font-size: 18px;
      font-weight: 700;
    }
    .brand-mark {
      width: 20px;
      height: 20px;
      display: block;
      object-fit: contain;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 10px;
      border: 1px solid rgba(250, 204, 21, 0.2);
      border-radius: var(--rt-radius);
      color: var(--rt-yellow);
      background: rgba(250, 204, 21, 0.06);
      font-family: var(--rt-mono);
      font-size: 11px;
      font-weight: 600;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: var(--rt-yellow);
    }
    .receiving .dot {
      background: var(--rt-green);
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.65);
    }
    .failed .dot {
      background: var(--rt-red);
    }
    .receiving {
      color: #4ade80;
      border-color: rgba(34, 197, 94, 0.16);
      background: rgba(34, 197, 94, 0.06);
    }
    .failed {
      color: var(--rt-red);
      border-color: rgba(255, 180, 171, 0.22);
      background: rgba(255, 180, 171, 0.06);
    }
    .stale {
      color: var(--rt-yellow);
      border-color: rgba(250, 204, 21, 0.2);
      background: rgba(250, 204, 21, 0.06);
    }
    .stack {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .card {
      border: 1px solid var(--rt-border-soft);
      border-radius: var(--rt-radius);
      background: var(--rt-surface);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.16);
    }
    .runtime-card {
      padding: 16px;
    }
    .runtime-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(64, 71, 81, 0.36);
      flex-wrap: wrap;
    }
    .runtime-title {
      font-size: 14px;
      font-weight: 700;
    }
    .runtime-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
      color: var(--rt-muted-soft);
      font-size: 13px;
      flex-wrap: wrap;
    }
    .separator {
      color: rgba(192, 199, 211, 0.35);
    }
    .runtime-select {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .runtime-select label {
      color: var(--rt-muted-soft);
      font-size: 12px;
      font-weight: 600;
    }
    .active-runtime-row {
      margin-top: 16px;
      padding: 14px;
      border: 1px solid rgba(159, 202, 255, 0.28);
      border-radius: var(--rt-radius);
      background: rgba(159, 202, 255, 0.08);
    }
    .active-runtime-row .runtime-select {
      justify-content: space-between;
      gap: 12px;
    }
    .active-runtime-row .custom-dropdown {
      width: 100%;
    }
    .active-runtime-row label {
      color: var(--rt-primary);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .active-runtime-row select {
      width: min(420px, 100%);
      font-weight: 700;
    }
    .runtime-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .runtime-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .runtime-field.focus-field {
      padding: 12px;
      border: 1px solid rgba(159, 202, 255, 0.22);
      border-radius: var(--rt-radius);
      background: rgba(159, 202, 255, 0.06);
    }
    .runtime-field.focus-field .field-label {
      color: var(--rt-primary);
    }
    .field-label {
      color: rgba(192, 199, 211, 0.62);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .field-value {
      color: var(--rt-text);
      font-size: 13px;
      overflow-wrap: anywhere;
    }
    .mono {
      font-family: var(--rt-mono);
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 12px;
      font-size: 14px;
      font-weight: 700;
    }
    .section-icon {
      color: var(--rt-muted-soft);
      font-size: 16px;
      line-height: 1;
    }
    .input-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .section-panel {
      padding: 16px;
      border: 1px solid var(--rt-border-soft);
      border-radius: var(--rt-radius);
      background: var(--rt-surface-low);
    }
    .inputs-panel {
      border-color: rgba(159, 202, 255, 0.16);
      box-shadow: inset 0 0 0 1px rgba(159, 202, 255, 0.018);
    }
    .inputs-panel .section-title {
      margin-bottom: 16px;
    }
    .view-model-panel {
      border-color: rgba(196, 181, 253, 0.17);
      box-shadow: inset 0 0 0 1px rgba(196, 181, 253, 0.018);
    }
    .view-model-unavailable {
      border-color: rgba(255, 180, 171, 0.24);
      background: rgba(255, 180, 171, 0.035);
    }
    .view-model-unavailable .section-title,
    .view-model-unavailable .section-icon {
      color: var(--rt-red);
    }
    .view-model-unavailable .view-model-empty {
      color: rgba(255, 218, 214, 0.78);
    }
    .property-group {
      margin-top: 16px;
    }
    .property-group:first-of-type {
      margin-top: 0;
    }
    .property-group-title {
      margin-bottom: 8px;
      color: var(--rt-muted);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .input-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-width: 0;
      padding: 12px;
      border: 1px solid var(--rt-border-soft);
      border-radius: var(--rt-radius);
      background: var(--rt-surface);
      transition: background 120ms ease, border-color 120ms ease;
    }
    .input-card:hover {
      border-color: rgba(138, 145, 157, 0.78);
      background: #151d25;
    }
    .input-main {
      min-width: 0;
    }
    .input-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .input-name {
      color: var(--rt-text);
      font-family: var(--rt-mono);
      font-size: 13px;
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .pill {
      padding: 0 5px;
      border: 1px solid rgba(64, 71, 81, 0.58);
      border-radius: 3px;
      color: rgba(192, 199, 211, 0.7);
      font-size: 9px;
      line-height: 15px;
    }
    .input-detail {
      margin-top: 3px;
      color: var(--rt-muted-soft);
      font-size: 11px;
    }
    dl {
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      gap: 8px 16px;
      margin: 20px 0;
    }
    dt {
      color: var(--rt-muted-soft);
    }
    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    th, td {
      padding: 8px 10px;
      border-bottom: 1px solid var(--rt-border-soft);
      text-align: left;
      vertical-align: middle;
    }
    th {
      color: var(--rt-muted-soft);
      font-weight: 600;
    }
    button, input {
      font: inherit;
    }
    button {
      padding: 6px 10px;
      color: var(--rt-text);
      background: var(--rt-surface-control);
      border: 1px solid rgba(64, 71, 81, 0.72);
      border-radius: 4px;
      cursor: pointer;
      transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
    }
    button:hover:not(:disabled) {
      background: var(--rt-surface-control-hover);
      border-color: rgba(138, 145, 157, 0.75);
    }
    button.secondary {
      color: var(--rt-muted-soft);
      background: transparent;
      border-color: transparent;
    }
    button.secondary:hover:not(:disabled) {
      color: var(--rt-text);
      background: rgba(45, 54, 62, 0.5);
    }
    button:disabled, input:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
    .primary-button {
      color: var(--rt-primary);
      background: rgba(159, 202, 255, 0.1);
      border-color: rgba(159, 202, 255, 0.24);
    }
    .primary-button:hover:not(:disabled) {
      background: rgba(159, 202, 255, 0.18);
      border-color: rgba(159, 202, 255, 0.38);
    }
    .icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      color: var(--rt-muted-soft);
    }
    .fire-button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
    }
    input[type="number"] {
      width: 44px;
      height: 28px;
      padding: 0 4px;
      color: var(--rt-text);
      background: transparent;
      border: 0;
      text-align: center;
      font-family: var(--rt-mono);
      appearance: textfield;
      -moz-appearance: textfield;
    }
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
      margin: 0;
      -webkit-appearance: none;
    }
    .custom-dropdown {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }
    .dropdown-label {
      color: var(--rt-muted-soft);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .runtime-dropdown {
      display: grid;
      grid-template-columns: max-content minmax(0, min(420px, 100%));
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .runtime-dropdown .dropdown-label {
      color: var(--rt-primary);
    }
    .field-dropdown {
      width: 180px;
      max-width: 100%;
    }
    .field-dropdown .dropdown-label {
      color: var(--rt-primary);
    }
    .dropdown-button {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      min-height: 34px;
      padding: 7px 34px 7px 10px;
      border: 1px solid rgba(95, 112, 132, 0.62);
      border-radius: 5px;
      background: linear-gradient(180deg, rgba(26, 35, 43, 0.98), rgba(18, 25, 32, 0.98));
      color: var(--rt-text);
      text-align: left;
    }
    .dropdown-button:hover,
    .custom-dropdown.open .dropdown-button {
      border-color: rgba(159, 202, 255, 0.62);
      background: linear-gradient(180deg, rgba(32, 43, 53, 0.98), rgba(20, 29, 37, 0.98));
    }
    .dropdown-button:focus {
      border-color: rgba(159, 202, 255, 0.78);
      box-shadow: 0 0 0 1px rgba(159, 202, 255, 0.24);
      outline: none;
    }
    .dropdown-value {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }
    .dropdown-chevron {
      position: absolute;
      right: 12px;
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 5px solid var(--rt-muted);
      transition: transform 120ms ease;
    }
    .custom-dropdown.open .dropdown-chevron {
      transform: rotate(180deg);
    }
    .dropdown-menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      z-index: 20;
      display: none;
      width: min(420px, max(100%, 260px));
      max-height: 260px;
      overflow: auto;
      padding: 4px;
      border: 1px solid rgba(95, 112, 132, 0.62);
      border-radius: 6px;
      background: #101922;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.38);
    }
    .field-dropdown .dropdown-menu {
      left: 0;
      right: auto;
      width: min(320px, max(100%, 220px));
    }
    .custom-dropdown.open .dropdown-menu {
      display: grid;
      gap: 2px;
    }
    .dropdown-option {
      width: 100%;
      min-height: 30px;
      padding: 6px 9px;
      border: 0;
      border-radius: 4px;
      background: transparent;
      color: var(--rt-text);
      text-align: left;
      font-weight: 500;
    }
    .dropdown-option:hover {
      background: rgba(159, 202, 255, 0.1);
    }
    .dropdown-option.selected {
      background: rgba(159, 202, 255, 0.18);
      color: var(--rt-primary);
    }
    select {
      width: 180px;
      padding: 7px 34px 7px 10px;
      color: var(--rt-text);
      background-color: var(--rt-surface-control);
      background-image:
        linear-gradient(45deg, transparent 50%, var(--rt-muted) 50%),
        linear-gradient(135deg, var(--rt-muted) 50%, transparent 50%);
      background-position:
        calc(100% - 18px) 50%,
        calc(100% - 13px) 50%;
      background-size: 5px 5px, 5px 5px;
      background-repeat: no-repeat;
      border: 1px solid var(--rt-border-soft);
      border-radius: 4px;
      font: inherit;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
    }
    select:focus {
      border-color: rgba(159, 202, 255, 0.72);
      box-shadow: 0 0 0 1px rgba(159, 202, 255, 0.24);
    }
    .field-select {
      width: 180px;
      max-width: 100%;
    }
    .field-select:hover,
    .field-select:focus {
      background: var(--rt-surface-control);
    }
    input[type="range"] {
      width: 108px;
      accent-color: var(--rt-primary);
    }
    .empty, .command-status, .meta {
      color: var(--rt-muted-soft);
    }
    .empty {
      margin-top: 24px;
    }
    .command-status {
      margin-top: 12px;
      min-height: 18px;
    }
    .control {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .snapshot-panel {
      padding: 24px;
      border: 1px solid var(--rt-border-soft);
      border-radius: var(--rt-radius);
      background: var(--rt-surface-low);
    }
    .snapshot-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .snapshot-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .snapshot-meta-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin: 18px 0 20px;
      padding: 12px;
      border: 1px solid rgba(64, 71, 81, 0.42);
      border-radius: var(--rt-radius);
      background: rgba(18, 25, 32, 0.72);
    }
    .snapshot-meta-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .snapshot-section {
      margin-top: 18px;
      padding-top: 18px;
      border-top: 1px solid rgba(64, 71, 81, 0.38);
    }
    .snapshot-section:first-of-type {
      margin-top: 0;
      padding-top: 0;
      border-top: 0;
    }
    .snapshot-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }
    .snapshot-section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 700;
    }
    .snapshot-count {
      color: var(--rt-muted-soft);
      font-size: 11px;
    }
    .snapshot-table {
      margin-top: 0;
      border: 1px solid rgba(64, 71, 81, 0.42);
      border-radius: var(--rt-radius);
      overflow: hidden;
      border-collapse: separate;
      border-spacing: 0;
      background: rgba(18, 25, 32, 0.42);
    }
    .snapshot-table th {
      padding: 9px 10px;
      background: rgba(26, 35, 43, 0.58);
      color: var(--rt-muted);
      font-size: 11px;
      letter-spacing: 0.02em;
    }
    .snapshot-table td {
      padding: 10px;
    }
    .value-chip {
      display: inline-block;
      max-width: 240px;
      padding: 2px 5px;
      border-radius: 4px;
      overflow-wrap: anywhere;
      background: rgba(45, 54, 62, 0.76);
      color: var(--rt-text);
      font-family: var(--rt-mono);
      font-size: 12px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 6px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(250, 204, 21, 0.1);
    }
    .snapshot-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      text-align: center;
    }
    .snapshot-icon {
      color: rgba(138, 145, 157, 0.58);
      font-size: 26px;
      line-height: 1;
    }
    .snapshot-title {
      font-size: 13px;
      font-weight: 700;
    }
    .snapshot-copy {
      max-width: 320px;
      color: var(--rt-muted-soft);
      font-size: 11px;
      line-height: 1.5;
    }
    .diff-changed {
      color: var(--rt-yellow);
    }
    .diff-added {
      color: #4ade80;
    }
    .diff-removed {
      color: var(--rt-red);
    }
    .switch {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .switch input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .track {
      width: 34px;
      height: 18px;
      border-radius: 999px;
      background: var(--rt-surface-control);
      border: 1px solid var(--rt-border-soft);
      position: relative;
    }
    .track::after {
      content: "";
      width: 12px;
      height: 12px;
      border-radius: 999px;
      background: var(--rt-muted);
      position: absolute;
      left: 3px;
      top: 2px;
      transition: transform 120ms ease;
    }
    .switch input:checked + .track {
      background: var(--rt-primary);
      border-color: var(--rt-primary);
    }
    .switch input:checked + .track::after {
      transform: translateX(16px);
      background: var(--rt-background);
    }
    .number-control {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 2px;
      border: 1px solid var(--rt-border-soft);
      border-radius: var(--rt-radius);
      background: var(--rt-surface-control);
    }
    .number-control input[type="range"] {
      display: none;
    }
    .view-model-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .view-model-summary {
      display: flex;
      gap: 16px;
      color: var(--rt-muted-soft);
      font-size: 12px;
      flex-wrap: wrap;
    }
    .view-model-empty {
      color: var(--rt-muted-soft);
      font-size: 12px;
      line-height: 1.5;
    }
    .value-button {
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .property-value {
      max-width: 180px;
      overflow-wrap: anywhere;
      color: var(--rt-text);
    }
    tr.command-sent {
      animation: flash 700ms ease-out;
    }
    tr.value-changed {
      animation: valueFlash 900ms ease-out;
    }
    @keyframes flash {
      from { background: rgba(159, 202, 255, 0.16); }
      to { background: transparent; }
    }
    @keyframes valueFlash {
      from { outline: 1px solid var(--rt-green); }
      to { outline: 1px solid transparent; }
    }
    .input-card.command-sent {
      animation: flash 700ms ease-out;
    }
    .input-card.value-changed {
      animation: valueFlash 900ms ease-out;
    }
    footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid rgba(64, 71, 81, 0.36);
      color: rgba(192, 199, 211, 0.62);
      font-family: var(--rt-mono);
      font-size: 11px;
    }
    @media (max-width: 760px) {
      .layout {
        width: calc(100vw - 32px);
        padding: 16px 0;
      }
      .app-header {
        align-items: flex-start;
        flex-direction: column;
      }
      .header-actions {
        width: 100%;
        align-items: flex-start;
        justify-content: flex-start;
      }
      .runtime-grid,
      .input-grid {
        grid-template-columns: 1fr;
      }
      .snapshot-meta-grid {
        grid-template-columns: 1fr;
      }
      .runtime-top {
        align-items: stretch;
        flex-direction: column;
      }
      .runtime-select {
        align-items: stretch;
        flex-direction: column;
      }
      .active-runtime-row .runtime-select {
        align-items: stretch;
      }
      .runtime-dropdown {
        grid-template-columns: 1fr;
      }
      .field-dropdown,
      .dropdown-menu,
      .field-dropdown .dropdown-menu {
        width: 100%;
      }
      select {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const app = document.getElementById('app');
    const brandIcon = ${brandIcon};
    let telemetryState = ${initialState};
    let serverStatus = ${initialStatus};
    let lastCommandStatus = '';
    let highlightedInput = null;
    let changedInputs = new Set();
    let previousValues = new Map();
    let openDropdownId = null;

    document.addEventListener('click', () => {
      if (openDropdownId === null) {
        return;
      }
      openDropdownId = null;
      render();
    });

    window.addEventListener('message', (event) => {
      if (event.data?.type === 'telemetry') {
        markChangedInputs(event.data.state?.activePayload ?? null);
        telemetryState = event.data.state;
        render();
      } else if (event.data?.type === 'serverStatus') {
        serverStatus = event.data.status;
        render();
      } else if (event.data?.type === 'commandSent') {
        lastCommandStatus = 'Command sent: ' + event.data.timestamp;
        render();
      } else if (event.data?.type === 'commandFailed') {
        lastCommandStatus = 'No connected runtime client';
        render();
      }
    });

    function render() {
      const activePayload = telemetryState.activePayload;
      const serverFailed = Boolean(serverStatus.serverError);
      const hasClients = serverStatus.clientCount > 0;
      const telemetryStale = Boolean(serverStatus.telemetryStale);
      const receiving = Boolean(activePayload) && hasClients && !serverFailed;
      const controlsDisabled = !hasClients || serverFailed;
      const statusClass = serverFailed ? 'failed' : receiving ? 'receiving' : telemetryStale ? 'stale' : '';
      const statusText = serverFailed
        ? 'Server failed to start'
        : receiving
          ? 'Receiving telemetry'
          : telemetryStale
            ? 'Telemetry stale'
            : 'Waiting for telemetry...';

      if (!activePayload) {
        app.innerHTML = \`
          <div class="layout">
            \${renderHeader(statusClass, statusText, telemetryStale)}
            <section class="snapshot-panel snapshot-empty">
              <span class="snapshot-icon">&#9676;</span>
              <div>
                <h3 class="snapshot-title">Waiting for telemetry</h3>
                <p class="snapshot-copy">Connect a Flutter app with RiveDebugger to inspect live Rive runtime telemetry.</p>
              </div>
              <div class="meta">
                Connected clients: \${serverStatus.clientCount} &middot; Last telemetry: \${escapeHtml(formatTimestamp(serverStatus.lastTelemetryAt))}
              </div>
              \${serverFailed ? '<p class="snapshot-copy">' + escapeHtml(serverStatus.serverError) + '</p>' : ''}
            </section>
          </div>
        \`;
        return;
      }

      const viewModel = normalizeViewModelTelemetry(activePayload.viewModel);
      const inputsSection = renderInputsSection(activePayload.inputs, controlsDisabled);
      const viewModelSection = renderViewModelSection(viewModel);
      const orderedSections = viewModel.state === 'supported'
        ? viewModelSection + inputsSection
        : inputsSection + viewModelSection;

      app.innerHTML = \`
        <div class="layout">
          \${renderHeader(statusClass, statusText, telemetryStale)}
          <div class="stack">
            \${renderRuntimeCard(activePayload, serverFailed, telemetryStale)}
            \${orderedSections}
          </div>
          \${renderFooter()}
        </div>
      \`;

      bindDropdowns();
      bindInspectRivControl();
      bindClearTelemetryControl();
      bindControls();
      if (changedInputs.size > 0) {
        window.setTimeout(() => {
          changedInputs.clear();
          render();
        }, 900);
      }
    }

    function renderHeader(statusClass, statusText, telemetryStale) {
      return \`
        <header class="app-header">
          <div class="brand">
            <img class="brand-mark" src="\${escapeAttribute(brandIcon)}" alt="" aria-hidden="true">
            <span>RiveTelemetry</span>
          </div>
          <div class="header-actions">
            <button type="button" class="primary-button" data-inspect-riv>Load .riv</button>
            \${telemetryStale ? '<button type="button" class="secondary" data-clear-telemetry>Clear telemetry</button>' : ''}
            <div class="status \${statusClass}">
              <span class="dot"></span>
              <span>\${escapeHtml(statusText)}</span>
            </div>
          </div>
        </header>
      \`;
    }

    function renderRuntimeCard(activePayload, serverFailed, telemetryStale) {
      return \`
        <section class="card runtime-card">
          <div class="runtime-top">
            <div>
              <h3 class="runtime-title">Runtime Information</h3>
              <div class="runtime-meta">
                <span>Clients: <strong>\${serverStatus.clientCount}</strong></span>
                <span class="separator">&bull;</span>
                <span>Last received: <strong><code>\${escapeHtml(formatTimestamp(serverStatus.lastTelemetryAt))}</code></strong></span>
                \${serverFailed ? '<span class="separator">&bull;</span><span>' + escapeHtml(serverStatus.serverError) + '</span>' : ''}
                \${telemetryStale ? '<span class="separator">&bull;</span><span>Last-known telemetry retained</span>' : ''}
              </div>
            </div>
          </div>
          <div class="active-runtime-row">
            \${renderDropdown('runtime-select', 'Active runtime', telemetryState.activeRuntimeId, runtimeDropdownOptions(), 'runtime')}
          </div>
          <div class="runtime-grid">
            \${renderStateMachineField(activePayload)}
            \${renderRuntimeField('Runtime ID', activePayload.runtimeId, true)}
            \${renderRuntimeField('Source', activePayload.source, true)}
            \${renderRuntimeField('Timestamp', formatTimestamp(activePayload.timestamp), true)}
          </div>
        </section>
      \`;
    }

    function renderRuntimeField(label, value, mono) {
      return \`
        <div class="runtime-field">
          <span class="field-label">\${escapeHtml(label)}</span>
          <span class="field-value \${mono ? 'mono' : ''}">\${escapeHtml(value)}</span>
        </div>
      \`;
    }

    function renderStateMachineField(activePayload) {
      return \`
        <div class="runtime-field focus-field">
          \${renderDropdown('state-machine-select', 'State Machine', activePayload.stateMachine, stateMachineDropdownOptions(activePayload), 'field')}
        </div>
      \`;
    }

    function renderInputCard(input, disabled) {
      return \`
        <div data-input-name="\${escapeAttribute(input.name)}" class="input-card \${rowClass(input)}">
          <div class="input-main">
            <div class="input-name-row">
              <span class="input-name">\${escapeHtml(input.name)}</span>
              <span class="pill">\${escapeHtml(input.type)}</span>
            </div>
            <div class="input-detail">\${renderInputDetail(input)}</div>
          </div>
          \${renderControl(input, disabled)}
        </div>
      \`;
    }

    function renderInputDetail(input) {
      if (input.type === 'boolean') {
        return 'State: <strong>' + escapeHtml(formatValue(input.value)) + '</strong>';
      }
      if (input.type === 'number') {
        return 'Value: <strong><code>' + escapeHtml(formatValue(input.value)) + '</code></strong>';
      }
      if (input.type === 'trigger') {
        return 'Trigger input';
      }
      return 'Unsupported input';
    }

    function rowClass(input) {
      const classes = [];
      if (highlightedInput === input.name) {
        classes.push('command-sent');
      }
      if (changedInputs.has(input.name)) {
        classes.push('value-changed');
      }
      return classes.join(' ');
    }

    function renderControl(input, disabled) {
      const disabledAttr = disabled ? 'disabled' : '';
      if (input.type === 'boolean') {
        return \`
          <label class="switch">
            <input type="checkbox" data-control="boolean" data-input-name="\${escapeAttribute(input.name)}" \${input.value ? 'checked' : ''} \${disabledAttr}>
            <span class="track"></span>
            <span>\${input.value ? 'true' : 'false'}</span>
          </label>
        \`;
      }

      if (input.type === 'number') {
        const value = Number(input.value ?? 0);
        return \`
          <span class="number-control">
            <button class="icon-button" type="button" data-control="number-step" data-delta="-1" data-input-name="\${escapeAttribute(input.name)}" \${disabledAttr}>-</button>
            <input type="range" data-control="number-range" data-input-name="\${escapeAttribute(input.name)}" min="0" max="100" step="1" value="\${escapeAttribute(value)}" \${disabledAttr}>
            <input type="number" data-control="number" data-input-name="\${escapeAttribute(input.name)}" value="\${escapeAttribute(value)}" step="1" \${disabledAttr}>
            <button class="icon-button" type="button" data-control="number-step" data-delta="1" data-input-name="\${escapeAttribute(input.name)}" \${disabledAttr}>+</button>
          </span>
        \`;
      }

      if (input.type === 'trigger') {
        return \`
          <button class="fire-button" type="button" data-control="trigger" data-input-name="\${escapeAttribute(input.name)}" \${disabledAttr}>&#9889; Fire</button>
        \`;
      }

      return '';
    }

    function runtimeDropdownOptions() {
      return telemetryState.runtimes.map((runtime) => {
        const label = runtime.label || runtime.runtimeId;
        return { value: runtime.runtimeId, label };
      });
    }

    function stateMachineDropdownOptions(activePayload) {
      return stateMachinesForRuntime(activePayload).map((stateMachine) => ({
        value: stateMachine,
        label: stateMachine,
      }));
    }

    function renderDropdown(id, label, selectedValue, options, tone) {
      const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0] ?? { value: '', label: '—' };
      const expanded = openDropdownId === id;
      const optionRows = options.map((option) => {
        const selected = option.value === selectedOption.value;
        return \`
          <button
            type="button"
            role="option"
            class="dropdown-option \${selected ? 'selected' : ''}"
            aria-selected="\${selected ? 'true' : 'false'}"
            data-dropdown-option
            data-dropdown-id="\${escapeAttribute(id)}"
            data-value="\${escapeAttribute(option.value)}"
          >\${escapeHtml(option.label)}</button>
        \`;
      }).join('');

      return \`
        <div class="custom-dropdown \${tone === 'runtime' ? 'runtime-dropdown' : 'field-dropdown'} \${expanded ? 'open' : ''}" data-dropdown-id="\${escapeAttribute(id)}">
          <span class="dropdown-label">\${escapeHtml(label)}</span>
          <button
            type="button"
            class="dropdown-button"
            aria-haspopup="listbox"
            aria-expanded="\${expanded ? 'true' : 'false'}"
            data-dropdown-button
            data-dropdown-id="\${escapeAttribute(id)}"
          >
            <span class="dropdown-value">\${escapeHtml(selectedOption.label)}</span>
            <span class="dropdown-chevron" aria-hidden="true"></span>
          </button>
          <div class="dropdown-menu" role="listbox">
            \${optionRows}
          </div>
        </div>
      \`;
    }

    function stateMachinesForRuntime(activePayload) {
      const payloads = telemetryState.payloads.length > 0 ? telemetryState.payloads : [activePayload];
      const stateMachines = payloads
        .filter((payload) => payload.runtimeId === activePayload.runtimeId)
        .map((payload) => payload.stateMachine)
        .filter((stateMachine) => typeof stateMachine === 'string' && stateMachine.length > 0);

      return [...new Set(stateMachines.length > 0 ? stateMachines : [activePayload.stateMachine])];
    }

    function renderInputsSection(inputs, disabled) {
      if (!Array.isArray(inputs) || inputs.length === 0) {
        return '';
      }

      return \`
        <section class="section-panel inputs-panel">
          <h3 class="section-title"><span class="section-icon">&#8801;</span>Inputs Control</h3>
          \${renderGroupedItems(inputs, (input) => input.type, (input) => renderInputCard(input, disabled))}
        </section>
      \`;
    }

    function renderViewModelSection(viewModel) {
      if (viewModel.state === 'not-enabled') {
        return \`
          <section class="section-panel view-model-panel view-model-unavailable">
            <h3 class="section-title"><span class="section-icon">&#9638;</span>ViewModel</h3>
            <p class="view-model-empty">ViewModel telemetry not enabled</p>
          </section>
        \`;
      }

      if (viewModel.state === 'unsupported') {
        return \`
          <section class="section-panel view-model-panel view-model-unavailable">
            <h3 class="section-title"><span class="section-icon">&#9638;</span>ViewModel</h3>
            <p class="view-model-empty">ViewModel not available\${viewModel.reason ? ': ' + escapeHtml(viewModel.reason) : ''}</p>
          </section>
        \`;
      }

      return \`
        <section class="\${viewModel.properties.length > 0 ? 'section-panel view-model-panel' : ''}">
          <div class="view-model-header">
            <h3 class="section-title"><span class="section-icon">&#9638;</span>ViewModel</h3>
            <div class="view-model-summary">
              <span>Name: <strong>\${escapeHtml(viewModel.viewModelName || '—')}</strong></span>
              <span>Instance: <strong>\${escapeHtml(viewModel.instanceName || '—')}</strong></span>
            </div>
          </div>
          \${viewModel.properties.length === 0
            ? '<p class="view-model-empty">No ViewModel properties reported.</p>'
            : renderGroupedItems(viewModel.properties, (property) => property.type, (property) => renderViewModelPropertyRow(viewModel, property))}
        </section>
      \`;
    }

    function renderGroupedItems(items, typeOf, renderItem) {
      const groups = new Map();
      for (const item of items) {
        const type = normalizeTelemetryType(typeOf(item));
        if (!groups.has(type)) {
          groups.set(type, []);
        }
        groups.get(type).push(item);
      }

      return telemetryTypeOrder()
        .filter((type) => groups.has(type))
        .map((type) => \`
          <div class="property-group">
            <div class="property-group-title">\${escapeHtml(labelForTelemetryType(type))}</div>
            <div class="input-grid">\${groups.get(type).map(renderItem).join('')}</div>
          </div>
        \`)
        .join('');
    }

    function telemetryTypeOrder() {
      return [
        'number',
        'string',
        'boolean',
        'color',
        'trigger',
        'enum',
        'image',
        'artboard',
        'list',
        'listAttributes',
        'integer',
        'unknown',
      ];
    }

    function normalizeTelemetryType(type) {
      const normalized = String(type || 'unknown');
      if (normalized === 'enumType') {
        return 'enum';
      }
      if (normalized === 'symbolListIndex') {
        return 'listAttributes';
      }
      if (telemetryTypeOrder().includes(normalized)) {
        return normalized;
      }
      return 'unknown';
    }

    function labelForTelemetryType(type) {
      if (type === 'listAttributes') {
        return 'List Attributes';
      }
      return type.charAt(0).toUpperCase() + type.slice(1);
    }

    function renderViewModelPropertyRow(viewModel, property) {
      return \`
        <div data-input-name="\${escapeAttribute(property.name)}" class="input-card \${rowClass({name: property.name})}">
          <div class="input-main">
            <div class="input-name-row">
              <span class="input-name">\${escapeHtml(property.name)}</span>
              <span class="pill">\${escapeHtml(property.type)}</span>
            </div>
            <div class="input-detail">\${renderViewModelPropertyDetail(property)}</div>
          </div>
          \${renderViewModelPropertyControl(viewModel, property)}
        </div>
      \`;
    }

    function renderViewModelPropertyDetail(property) {
      if (property.type === 'trigger') {
        return 'Trigger property';
      }
      return 'Value: <strong><code>' + escapeHtml(formatViewModelValue(property.value)) + '</code></strong>';
    }

    function renderViewModelPropertyControl(viewModel, property) {
      const attrs = viewModelPropertyAttributes(viewModel, property);
      if (property.type === 'boolean') {
        return \`
          <label class="switch">
            <input type="checkbox" data-control="view-model-property" \${attrs} \${property.value ? 'checked' : ''}>
            <span class="track"></span>
            <span>\${property.value ? 'true' : 'false'}</span>
          </label>
        \`;
      }

      if (property.type === 'number') {
        const value = Number(property.value ?? 0);
        return \`
          <span class="number-control">
            <button class="icon-button" type="button" data-control="view-model-property-step" data-delta="-1" \${attrs}>-</button>
            <input type="number" data-control="view-model-property" \${attrs} value="\${escapeAttribute(value)}" step="1">
            <button class="icon-button" type="button" data-control="view-model-property-step" data-delta="1" \${attrs}>+</button>
          </span>
        \`;
      }

      if (property.type === 'trigger') {
        return \`
          <button class="fire-button" type="button" data-control="view-model-property" \${attrs}>&#9889; Fire</button>
        \`;
      }

      if (isMutableViewModelProperty(property)) {
        return \`
          <button class="value-button" type="button" data-control="view-model-property" \${attrs}>\${escapeHtml(formatViewModelValue(property.value))}</button>
        \`;
      }

      return \`<code class="property-value">\${escapeHtml(formatViewModelValue(property.value))}</code>\`;
    }

    function viewModelPropertyAttributes(viewModel, property) {
      return \`
        data-view-model-name="\${escapeAttribute(viewModel.viewModelName)}"
        data-instance-name="\${escapeAttribute(viewModel.instanceName)}"
        data-property-name="\${escapeAttribute(property.name)}"
        data-property-type="\${escapeAttribute(property.type)}"
        data-property-value="\${escapeAttribute(property.value ?? '')}"
      \`;
    }

    function normalizeViewModelTelemetry(value) {
      if (!value || typeof value !== 'object') {
        return {
          state: 'not-enabled',
          properties: [],
        };
      }

      const supported = value.supported === true;
      const properties = Array.isArray(value.properties)
        ? value.properties
            .filter((property) => property && typeof property === 'object')
            .map((property) => ({
              name: typeof property.name === 'string' ? property.name : '',
              type: typeof property.type === 'string' ? property.type : 'unknown',
              value: property.value ?? null,
            }))
            .filter((property) => property.name.length > 0)
        : [];

      if (!supported) {
        return {
          state: 'unsupported',
          reason: typeof value.reason === 'string' ? value.reason : '',
          viewModelName: typeof value.viewModelName === 'string' ? value.viewModelName : '',
          instanceName: typeof value.instanceName === 'string' ? value.instanceName : '',
          properties: [],
        };
      }

      return {
        state: 'supported',
        viewModelName: typeof value.viewModelName === 'string' ? value.viewModelName : '',
        instanceName: typeof value.instanceName === 'string' ? value.instanceName : '',
        properties,
      };
    }

    function isMutableViewModelProperty(property) {
      return property.type === 'number' ||
        property.type === 'boolean' ||
        property.type === 'string' ||
        property.type === 'color' ||
        property.type === 'enum' ||
        property.type === 'trigger';
    }

    function renderSnapshotPanel(activePayload, snapshot, diffs, viewModelDiffs) {
      const diffRows = diffs.map((diff) => \`
        <tr>
          <td><code>\${escapeHtml(diff.name)}</code></td>
          <td>\${escapeHtml(diff.type)}</td>
          <td><span class="value-chip">\${escapeHtml(formatValue(diff.snapshotValue))}</span></td>
          <td><span class="value-chip">\${escapeHtml(formatValue(diff.currentValue))}</span></td>
          <td><span class="status-badge diff-\${escapeAttribute(diff.status)}">\${escapeHtml(diff.status)}</span></td>
        </tr>
      \`).join('');
      const viewModelDiffRows = viewModelDiffs.map((diff) => \`
        <tr>
          <td><code>\${escapeHtml(diff.name)}</code></td>
          <td>\${escapeHtml(diff.type)}</td>
          <td><span class="value-chip">\${escapeHtml(formatViewModelValue(diff.from))}</span></td>
          <td><span class="value-chip">\${escapeHtml(formatViewModelValue(diff.to))}</span></td>
        </tr>
      \`).join('');
      const snapshotViewModel = snapshot?.viewModel?.supported ? snapshot.viewModel : null;
      const snapshotViewModelLabel = snapshotViewModel
        ? (snapshotViewModel.viewModelName || '—') + ' / ' + (snapshotViewModel.instanceName || '—')
        : '—';

      if (!snapshot) {
        return \`
          <section class="snapshot-panel snapshot-empty">
            <span class="snapshot-icon">&#9676;</span>
            <div>
              <h3 class="snapshot-title">No snapshot captured</h3>
              <p class="snapshot-copy">Capture a state snapshot to diff against future telemetry events.</p>
            </div>
            <div class="snapshot-actions">
              <button type="button" class="primary-button" data-snapshot-action="capture" data-runtime-id="\${escapeAttribute(activePayload.runtimeId)}">Capture</button>
              <button type="button" class="secondary" data-snapshot-action="clear" data-runtime-id="\${escapeAttribute(activePayload.runtimeId)}" disabled>Clear</button>
            </div>
          </section>
        \`;
      }

      return \`
        <section class="snapshot-panel">
          <div class="snapshot-header">
            <div>
              <h2>Snapshot Diff</h2>
              <div class="meta">Captured \${escapeHtml(formatTimestamp(snapshot.capturedAt))}</div>
            </div>
            <div class="snapshot-actions">
              <button type="button" class="primary-button" data-snapshot-action="capture" data-runtime-id="\${escapeAttribute(activePayload.runtimeId)}">Capture</button>
              <button type="button" class="secondary" data-snapshot-action="clear" data-runtime-id="\${escapeAttribute(activePayload.runtimeId)}">Clear</button>
            </div>
          </div>
          <div class="snapshot-meta-grid">
            \${renderSnapshotMetaItem('Runtime', snapshot.runtimeId, true)}
            \${renderSnapshotMetaItem('State Machine', snapshot.stateMachine, false)}
            \${renderSnapshotMetaItem('ViewModel', snapshotViewModelLabel, false)}
          </div>
          \${renderInputSnapshotDiffTable(diffRows, diffs.length)}
          \${snapshotViewModel ? renderViewModelSnapshotDiffTable(viewModelDiffRows, viewModelDiffs.length) : ''}
        </section>
      \`;
    }

    function renderSnapshotMetaItem(label, value, mono) {
      return \`
        <div class="snapshot-meta-item">
          <span class="field-label">\${escapeHtml(label)}</span>
          <span class="field-value \${mono ? 'mono' : ''}">\${escapeHtml(value)}</span>
        </div>
      \`;
    }

    function renderInputSnapshotDiffTable(diffRows, diffCount) {
      return \`
        <div class="snapshot-section">
          <div class="snapshot-section-header">
            <h3 class="snapshot-section-title"><span class="section-icon">&#8801;</span>Input Changes</h3>
            <span class="snapshot-count">\${diffCount} changed</span>
          </div>
          \${diffCount === 0
            ? '<p class="empty">No input value differences from the captured snapshot.</p>'
            : \`
              <table class="snapshot-table">
                <thead>
                  <tr><th>Name</th><th>Type</th><th>Snapshot</th><th>Current</th><th>Status</th></tr>
                </thead>
                <tbody>\${diffRows}</tbody>
              </table>
            \`}
        </div>
      \`;
    }

    function renderViewModelSnapshotDiffTable(diffRows, diffCount) {
      return \`
        <div class="snapshot-section">
          <div class="snapshot-section-header">
            <h3 class="snapshot-section-title"><span class="section-icon">&#9638;</span>ViewModel Changes</h3>
            <span class="snapshot-count">\${diffCount} changed</span>
          </div>
          \${diffCount === 0
            ? '<p class="empty">No ViewModel property differences from the captured snapshot.</p>'
            : \`
              <table class="snapshot-table">
                <thead>
                  <tr><th>Name</th><th>Type</th><th>From</th><th>To</th></tr>
                </thead>
                <tbody>\${diffRows}</tbody>
              </table>
            \`}
        </div>
      \`;
    }

    function renderFooter() {
      return \`
        <footer>
          <span>Last command sent: \${escapeHtml(lastCommandStatus || 'none')}</span>
        </footer>
      \`;
    }

    function bindDropdowns() {
      app.querySelectorAll('[data-dropdown-button]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          const dropdownId = button.dataset.dropdownId;
          openDropdownId = openDropdownId === dropdownId ? null : dropdownId;
          render();
        });
      });

      app.querySelectorAll('[data-dropdown-option]').forEach((option) => {
        option.addEventListener('click', (event) => {
          event.stopPropagation();
          const dropdownId = option.dataset.dropdownId;
          const value = option.dataset.value;
          openDropdownId = null;
          if (!dropdownId || value === undefined) {
            render();
            return;
          }
          if (dropdownId === 'runtime-select') {
            selectRuntimeById(value);
            return;
          }
          if (dropdownId === 'state-machine-select') {
            selectStateMachineForActiveRuntime(value);
            return;
          }
          render();
        });
      });
    }

    function bindClearTelemetryControl() {
      const control = app.querySelector('[data-clear-telemetry]');
      if (!control) {
        return;
      }

      control.addEventListener('click', () => {
        vscode.postMessage({
          command: 'clearTelemetry',
        });
      });
    }

    function bindInspectRivControl() {
      const control = app.querySelector('[data-inspect-riv]');
      if (!control) {
        return;
      }

      control.addEventListener('click', () => {
        vscode.postMessage({
          command: 'inspectFile',
        });
      });
    }

    function selectRuntimeById(runtimeId) {
      const nextPayload = findRuntimePayload(runtimeId);
      const nextSnapshot = findRuntimeSnapshot(runtimeId);
      telemetryState = {
        ...telemetryState,
        activeRuntimeId: runtimeId,
        activePayload: nextPayload,
        activeSnapshot: nextSnapshot,
        activeDiffs: nextPayload && nextSnapshot ? diffSnapshot(nextSnapshot, nextPayload) : [],
        activeViewModelDiffs: nextPayload && nextSnapshot ? diffViewModelSnapshot(nextSnapshot, nextPayload) : [],
      };
      previousValues = new Map();
      changedInputs.clear();
      vscode.postMessage({
        command: 'selectRuntime',
        runtimeId,
      });
      render();
    }

    function selectStateMachineForActiveRuntime(stateMachine) {
      const activePayload = telemetryState.activePayload;
      if (!activePayload || activePayload.stateMachine === stateMachine) {
        return;
      }

      const nextPayload = telemetryState.payloads.find((payload) =>
        payload.runtimeId === activePayload.runtimeId &&
        payload.stateMachine === stateMachine
      );
      if (!nextPayload) {
        return;
      }

      const nextSnapshot = findRuntimeSnapshot(nextPayload.runtimeId);
      telemetryState = {
        ...telemetryState,
        activePayload: nextPayload,
        activeSnapshot: nextSnapshot,
        activeDiffs: nextSnapshot ? diffSnapshot(nextSnapshot, nextPayload) : [],
        activeViewModelDiffs: nextSnapshot ? diffViewModelSnapshot(nextSnapshot, nextPayload) : [],
      };
      previousValues = new Map();
      changedInputs.clear();
      render();
    }

    function bindSnapshotControls() {
      app.querySelectorAll('[data-snapshot-action]').forEach((control) => {
        control.addEventListener('click', () => {
          const runtimeId = control.dataset.runtimeId;
          if (!runtimeId) {
            return;
          }

          vscode.postMessage({
            command: control.dataset.snapshotAction === 'clear' ? 'clearSnapshot' : 'captureSnapshot',
            runtimeId,
          });
        });
      });
    }

    function findRuntimePayload(runtimeId) {
      if (telemetryState.activePayload?.runtimeId === runtimeId) {
        return telemetryState.activePayload;
      }

      return telemetryState.payloads.find((payload) => payload.runtimeId === runtimeId) ?? null;
    }

    function findRuntimeSnapshot(runtimeId) {
      return telemetryState.snapshots.find((snapshot) => snapshot.runtimeId === runtimeId) ?? null;
    }

    function diffSnapshot(snapshot, payload) {
      const currentInputs = new Map(payload.inputs.flatMap(toInputSnapshot).map((input) => [input.name, input]));
      const snapshotInputs = new Map(snapshot.inputs.map((input) => [input.name, input]));
      const diffs = [];

      for (const [name, current] of currentInputs) {
        const previous = snapshotInputs.get(name);
        if (!previous) {
          diffs.push({
            name,
            type: current.type,
            snapshotValue: null,
            currentValue: current.value,
            status: 'added',
          });
          continue;
        }

        if (previous.type !== current.type || previous.value !== current.value) {
          diffs.push({
            name,
            type: current.type,
            snapshotValue: previous.value,
            currentValue: current.value,
            status: 'changed',
          });
        }
      }

      for (const [name, previous] of snapshotInputs) {
        if (!currentInputs.has(name)) {
          diffs.push({
            name,
            type: previous.type,
            snapshotValue: previous.value,
            currentValue: null,
            status: 'removed',
          });
        }
      }

      return diffs;
    }

    function diffViewModelSnapshot(snapshot, payload) {
      const snapshotViewModel = snapshot.viewModel?.supported ? snapshot.viewModel : null;
      const currentViewModel = normalizeViewModelTelemetry(payload.viewModel);
      if (!snapshotViewModel || currentViewModel.state !== 'supported') {
        return [];
      }

      if (
        snapshotViewModel.viewModelName !== currentViewModel.viewModelName ||
        snapshotViewModel.instanceName !== currentViewModel.instanceName
      ) {
        return diffDifferentViewModelInstances(snapshotViewModel, currentViewModel);
      }

      const snapshotProperties = new Map(normalizeSnapshotViewModelProperties(snapshotViewModel.properties).map((property) => [property.name, property]));
      const currentProperties = new Map(currentViewModel.properties.map((property) => [property.name, property]));
      const diffs = [];

      for (const [name, current] of currentProperties) {
        const previous = snapshotProperties.get(name);
        if (!previous) {
          diffs.push({name, type: current.type, from: null, to: current.value, changed: true});
          continue;
        }

        if (previous.type !== current.type || !areViewModelValuesEqual(previous.value, current.value)) {
          diffs.push({name, type: current.type, from: previous.value, to: current.value, changed: true});
        }
      }

      for (const [name, previous] of snapshotProperties) {
        if (!currentProperties.has(name)) {
          diffs.push({name, type: previous.type, from: previous.value, to: null, changed: true});
        }
      }

      return diffs;
    }

    function diffDifferentViewModelInstances(snapshotViewModel, currentViewModel) {
      const snapshotProperties = new Map(normalizeSnapshotViewModelProperties(snapshotViewModel.properties).map((property) => [property.name, property]));
      const currentProperties = new Map(currentViewModel.properties.map((property) => [property.name, property]));
      const names = new Set([...snapshotProperties.keys(), ...currentProperties.keys()]);
      return [...names].map((name) => {
        const previous = snapshotProperties.get(name);
        const current = currentProperties.get(name);
        return {
          name,
          type: current?.type ?? previous?.type ?? 'unknown',
          from: previous?.value ?? null,
          to: current?.value ?? null,
          changed: true,
        };
      });
    }

    function normalizeSnapshotViewModelProperties(properties) {
      return Array.isArray(properties)
        ? properties
            .filter((property) => property && typeof property === 'object')
            .map((property) => ({
              name: typeof property.name === 'string' ? property.name : '',
              type: typeof property.type === 'string' ? property.type : 'unknown',
              value: property.value ?? null,
            }))
            .filter((property) => property.name.length > 0)
        : [];
    }

    function areViewModelValuesEqual(left, right) {
      return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
    }

    function toInputSnapshot(input) {
      if (input.type !== 'boolean' && input.type !== 'number' && input.type !== 'trigger') {
        return [];
      }

      return [{
        name: input.name,
        type: input.type,
        value: input.value,
      }];
    }

    function bindControls() {
      app.querySelectorAll('[data-control="boolean"]').forEach((control) => {
        control.addEventListener('change', () => {
          const activePayload = telemetryState.activePayload;
          if (!activePayload) {
            return;
          }
          sendCommand({
            type: 'setInput',
            runtimeId: activePayload.runtimeId,
            stateMachine: activePayload.stateMachine,
            inputName: control.dataset.inputName,
            inputType: 'boolean',
            value: control.checked,
          });
        });
      });

      app.querySelectorAll('[data-control="number"], [data-control="number-range"]').forEach((control) => {
        const sendNumber = () => {
          const value = Number(control.value);
          if (Number.isNaN(value)) {
            return;
          }
          sendNumberCommand(control.dataset.inputName, value);
        };
        control.addEventListener('change', sendNumber);
        control.addEventListener('input', () => {
          if (control.dataset.control === 'number-range') {
            sendNumber();
          }
        });
        control.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            sendNumber();
          }
        });
      });

      app.querySelectorAll('[data-control="number-step"]').forEach((control) => {
        control.addEventListener('click', () => {
          const activePayload = telemetryState.activePayload;
          if (!activePayload) {
            return;
          }
          const inputName = control.dataset.inputName;
          const current = activePayload.inputs.find((input) => input.name === inputName);
          const delta = Number(control.dataset.delta ?? 0);
          sendNumberCommand(inputName, Number(current?.value ?? 0) + delta);
        });
      });

      app.querySelectorAll('[data-control="trigger"]').forEach((control) => {
        control.addEventListener('click', () => {
          const activePayload = telemetryState.activePayload;
          if (!activePayload) {
            return;
          }
          sendCommand({
            type: 'fireTrigger',
            runtimeId: activePayload.runtimeId,
            stateMachine: activePayload.stateMachine,
            inputName: control.dataset.inputName,
          });
        });
      });

      app.querySelectorAll('[data-control="view-model-property"]').forEach((control) => {
        control.addEventListener('click', () => {
          if (control instanceof HTMLInputElement && control.type === 'number') {
            return;
          }
          sendViewModelPropertyCommand(control);
        });
        control.addEventListener('change', () => {
          if (control instanceof HTMLInputElement) {
            sendViewModelPropertyCommand(control);
          }
        });
        control.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' && control instanceof HTMLInputElement) {
            sendViewModelPropertyCommand(control);
          }
        });
      });

      app.querySelectorAll('[data-control="view-model-property-step"]').forEach((control) => {
        control.addEventListener('click', () => {
          const delta = Number(control.dataset.delta ?? 0);
          const current = Number(control.dataset.propertyValue ?? 0);
          sendViewModelPropertyCommand(control, current + delta);
        });
      });
    }

    function sendViewModelPropertyCommand(control, explicitValue) {
          const activePayload = telemetryState.activePayload;
          if (!activePayload) {
            return;
          }

          const propertyName = control.dataset.propertyName;
          const propertyType = control.dataset.propertyType;
          const viewModelName = control.dataset.viewModelName ?? '';
          const instanceName = control.dataset.instanceName ?? '';
          if (!propertyName || !propertyType || !viewModelName || !instanceName) {
            return;
          }

      const value = explicitValue ?? nextViewModelPropertyValue(propertyType, control);
          if (value === undefined) {
            return;
          }

          sendCommand({
            type: 'setViewModelProperty',
            runtimeId: activePayload.runtimeId,
            viewModelName,
            instanceName,
            propertyName,
            propertyType,
            ...(propertyType === 'trigger' ? {} : { value }),
          });
    }

    function nextViewModelPropertyValue(propertyType, control) {
      const currentValue = control.dataset.propertyValue ?? '';
      if (propertyType === 'trigger') {
        return null;
      }

      if (propertyType === 'boolean') {
        if (control instanceof HTMLInputElement) {
          return control.checked;
        }
        return currentValue !== 'true';
      }

      if (propertyType === 'number' && control instanceof HTMLInputElement) {
        const value = Number(control.value);
        return Number.isNaN(value) ? undefined : value;
      }

      const label = 'Set ' + propertyType + ' value';
      const entered = window.prompt(label, currentValue);
      if (entered === null) {
        return undefined;
      }

      if (propertyType === 'number') {
        const value = Number(entered);
        return Number.isNaN(value) ? undefined : value;
      }

      return entered;
    }

    function sendNumberCommand(inputName, value) {
      const activePayload = telemetryState.activePayload;
      if (!activePayload) {
        return;
      }
      sendCommand({
        type: 'setInput',
        runtimeId: activePayload.runtimeId,
        stateMachine: activePayload.stateMachine,
        inputName,
        inputType: 'number',
        value,
      });
    }

    function sendCommand(payload) {
      highlightedInput = payload.inputName ?? payload.propertyName;
      vscode.postMessage({
        command: 'sendTelemetryCommand',
        payload,
      });
      render();
      window.setTimeout(() => {
        highlightedInput = null;
        render();
      }, 700);
    }

    function markChangedInputs(nextPayload) {
      if (!nextPayload) {
        return;
      }

      const nextValues = new Map();
      for (const input of nextPayload.inputs) {
        const signature = JSON.stringify([input.type, input.value]);
        nextValues.set(input.name, signature);
        if (previousValues.has(input.name) && previousValues.get(input.name) !== signature) {
          changedInputs.add(input.name);
        }
      }
      previousValues = nextValues;
    }

    function formatValue(value) {
      return value === null ? 'null' : String(value);
    }

    function formatViewModelValue(value) {
      if (value === null || value === undefined) {
        return '—';
      }
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
      }
      return String(value);
    }

    function formatTimestamp(value) {
      if (!value) {
        return 'never';
      }

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return String(value);
      }

      return date.toLocaleTimeString();
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    function escapeAttribute(value) {
      return escapeHtml(value);
    }

    if (telemetryState.activePayload) {
      markChangedInputs(telemetryState.activePayload);
      changedInputs.clear();
    }
    render();
  </script>
</body>
</html>`;
}

function createNonce(): string {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let index = 0; index < 32; index++) {
    nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return nonce;
}

