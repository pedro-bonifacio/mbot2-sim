// Tiny arithmetic for level files: numbers, variant parameter names, + - * / and
// parentheses (docs/LEVEL_FORMAT.md). No functions, no other syntax — level files
// stay data. Example: "wallX - 10", "(top + bottom) / 2".

/** Evaluates `v` (a number, or an expression string) with `params`. Throws on bad input. */
export function evalNumber(v, params = {}) {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') throw new Error(`expected a number or expression, got ${JSON.stringify(v)}`);
  const tokens = v.match(/\d+(?:\.\d+)?|[A-Za-z_][A-Za-z0-9_]*|[-+*/()]|\S/g) || [];
  let i = 0;
  const peek = () => tokens[i];
  const fail = (msg) => { throw new Error(`${msg} in "${v}"`); };

  function primary() {
    const t = tokens[i++];
    if (t === undefined) fail('unexpected end');
    if (t === '(') { const x = sum(); if (tokens[i++] !== ')') fail('missing )'); return x; }
    if (t === '-') return -primary();
    if (t === '+') return primary();
    if (/^\d/.test(t)) return Number(t);
    if (/^[A-Za-z_]/.test(t)) {
      if (!Object.prototype.hasOwnProperty.call(params, t)) fail(`unknown parameter "${t}"`);
      return params[t];
    }
    return fail(`unexpected "${t}"`);
  }
  function product() {
    let x = primary();
    while (peek() === '*' || peek() === '/') x = tokens[i++] === '*' ? x * primary() : x / primary();
    return x;
  }
  function sum() {
    let x = product();
    while (peek() === '+' || peek() === '-') x = tokens[i++] === '+' ? x + product() : x - product();
    return x;
  }

  const result = sum();
  if (i < tokens.length) fail(`unexpected "${tokens[i]}"`);
  if (!Number.isFinite(result)) fail('result is not a finite number');
  return result;
}
