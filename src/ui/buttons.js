const _pressed = new Set();

/** Returns true while the button with the given id is held down. */
export function isPressed(buttonId) {
  return _pressed.has(String(buttonId).toUpperCase());
}

export function initButtons() {
  const container = document.getElementById('button-row');
  if (!container) return;

  const BUTTONS = [
    { id: 'A',      label: 'A' },
    { id: 'B',      label: 'B' },
    { id: 'UP',     label: '↑' },
    { id: 'DOWN',   label: '↓' },
    { id: 'LEFT',   label: '←' },
    { id: 'RIGHT',  label: '→' },
    { id: 'MIDDLE', label: '●' },
  ];

  for (const { id, label } of BUTTONS) {
    const btn = document.createElement('button');
    btn.className = 'virtual-btn';
    btn.dataset.btnId = id;
    btn.innerHTML = `<span class="vbtn-label">${label}</span>`;

    const press   = () => { _pressed.add(id);    btn.classList.add('active');    };
    const release = () => { _pressed.delete(id); btn.classList.remove('active'); };

    btn.addEventListener('mousedown',   press);
    btn.addEventListener('touchstart',  press,   { passive: true });
    btn.addEventListener('mouseup',     release);
    btn.addEventListener('mouseleave',  release);
    btn.addEventListener('touchend',    release, { passive: true });
    btn.addEventListener('touchcancel', release, { passive: true });

    container.appendChild(btn);
  }

  console.log('[buttons] virtual buttons initialised');
}
