const MAX_LINES = 200;

let panel = null;

export function initConsole() {
  panel = document.getElementById('console-panel');
}

export function appendConsoleMessage(text, level = 'info') {
  if (!panel) return;
  const div = document.createElement('div');
  div.textContent = text;
  div.style.color = level === 'error' ? '#f87171'
                  : level === 'warn'  ? '#fbbf24'
                  :                     '#4ade80';
  panel.appendChild(div);
  // Trim to MAX_LINES
  while (panel.children.length > MAX_LINES) {
    panel.removeChild(panel.firstChild);
  }
  panel.scrollTop = panel.scrollHeight;
}

export function log(msg)   { appendConsoleMessage(String(msg), 'info');  }
export function warn(msg)  { appendConsoleMessage(String(msg), 'warn');  }
export function error(msg) { appendConsoleMessage(String(msg), 'error'); }

export function clear() {
  if (panel) panel.innerHTML = '';
}
