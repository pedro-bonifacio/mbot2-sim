const NUM_LEDS = 5;

export const ledState = Array.from({ length: NUM_LEDS }, () => ({ on: false, colour: '#000000' }));

export function led_on(index, colour) {
  const hex = String(colour || '#ffffff');
  if (String(index) === 'ALL') {
    ledState.forEach(led => { led.on = true; led.colour = hex; });
  } else {
    const i = Number(index) - 1;
    if (i >= 0 && i < NUM_LEDS) { ledState[i].on = true; ledState[i].colour = hex; }
  }
}

export function led_off(index) {
  if (String(index) === 'ALL') {
    ledState.forEach(led => { led.on = false; });
  } else {
    const i = Number(index) - 1;
    if (i >= 0 && i < NUM_LEDS) ledState[i].on = false;
  }
}

export function led_set_all(colour) {
  led_on('ALL', colour);
}

export function resetLeds() {
  ledState.forEach(led => { led.on = false; led.colour = '#000000'; });
}
