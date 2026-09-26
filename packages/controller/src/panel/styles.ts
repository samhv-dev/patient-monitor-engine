// Panel and remote CSS, injected once per document. Touch-sized (≥ 44 px targets) for iPad use.
export const PANEL_CSS = `
.pme-drawer{position:fixed;top:0;right:0;bottom:0;width:min(420px,92vw);background:#111c;color:#ddd;
  backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border-left:1px solid #333;z-index:2147483000;
  transform:translateX(100%);transition:transform .18s ease-out;display:flex;flex-direction:column;
  font:14px system-ui,sans-serif}
.pme-drawer[data-open="true"]{transform:none}
.pme-drawer header{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #333}
.pme-drawer header h2{font-size:15px;margin:0;flex:1}
.pme-tabs{display:flex;border-bottom:1px solid #333}
.pme-tabs button{flex:1;background:none;border:0;color:#aaa;padding:10px;min-height:44px;font:inherit}
.pme-tabs button[aria-selected="true"]{color:#fff;box-shadow:inset 0 -2px #4af}
.pme-panes{display:flex;flex-direction:column;flex:1;min-height:0}
.pme-body{overflow:auto;flex:1;padding:8px 10px}
.pme-section{margin:0 0 14px}
.pme-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#8ab;margin:6px 0}
.pme-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:6px 0}
.pme-row label{display:inline-flex;align-items:center;gap:4px}
.pme-drawer button,.pme-remote button,.pme-drawer select,.pme-remote select,.pme-drawer input,.pme-remote input{
  font:inherit;min-height:36px;background:#222;color:#eee;border:1px solid #444;border-radius:6px;padding:4px 8px}
.pme-drawer input[type=number],.pme-remote input[type=number]{width:5.5em}
.pme-readout{font-variant-numeric:tabular-nums;color:#9c9;min-width:9em}
.pme-flag{display:inline-block;min-width:1.4em;text-align:center;border-radius:4px;font-weight:700}
.pme-flag-blue{background:#1e5bd8;color:#fff}.pme-flag-yellow{background:#e6c200;color:#000}
.pme-flag-pin{background:#555;color:#fff}.pme-flag-model{background:#264;color:#fff}
.pme-stagebar{display:flex;gap:6px;align-items:center;padding:6px 10px;border-top:1px solid #333}
.pme-stagebar[data-count="0"] .pme-commit{opacity:.5}
.pme-log{font:12px ui-monospace,monospace;list-style:none;margin:0;padding:0}
.pme-log li{padding:2px 0;border-bottom:1px solid #222}
.pme-log li[data-kind="note"]{color:#fc6}.pme-log li[data-kind="alarm"]{color:#f66}
.pme-log li[data-kind="ack"]{color:#8a8}
.pme-status{font-size:12px;color:#aaa}.pme-status[data-ok="false"]{color:#f66}
.pme-remote{background:#000;color:#ddd;font:15px system-ui,sans-serif;padding:10px;max-width:640px;margin:auto}
.pme-remote .pme-vitals{display:flex;gap:18px;font-size:28px;font-variant-numeric:tabular-nums;margin:8px 0}
.pme-scn-error{color:#f66;font-size:12px;white-space:pre-wrap}
.pme-scn-next,.pme-scn-states{margin:0;padding-left:18px}
.pme-scn-next li,.pme-scn-states li{margin:4px 0}
.pme-scn-states li[aria-current="step"]{color:#fff;font-weight:700}
.pme-scn-notes{color:#aaa;font-size:12px;margin:4px 0}
.pme-scn-remote{border:1px solid #333;border-radius:8px;padding:6px 8px;margin:8px 0}
`;

export function injectStyles(doc: Document): void {
  if (doc.getElementById('pme-panel-css')) return;
  const s = doc.createElement('style');
  s.id = 'pme-panel-css';
  s.textContent = PANEL_CSS;
  doc.head.append(s);
}
