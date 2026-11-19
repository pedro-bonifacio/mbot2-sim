// Tiny arithmetic for level files: numbers, variant parameter names, + - * /,
// parentheses and one comparison (< <= > >= == !=, giving 1 or 0, for `when:`)
// (docs/LEVEL_FORMAT.md). No functions, no other syntax — level files stay data.
// Examples: "wallX - 10", "(top + bottom) / 2", "stripes >= 4".

/** Evaluates `v` (a number, or an expression string) with `params`. Throws on bad input. */
export function evalNumber(v, params = {}) {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') throw new Error(`expected a number or expression, got ${JSON.stringify(v)}`);
  const tokens = v.match(/\d+(?:\.\d+)?|[A-Za-z_][A-Za-z0-9_]*|<=|>=|==|!=|[-+*/()<>]|\S/g) || [];
  let i = 0;
  const peek = () => tokens[i];
  const fail = (msg) => { throw new Error(`${msg} in "${v}"`); };

  function primary() {
    const t = tokens[i++];
    if (t === undefined) fail('unexpected end');
    if (t === '(') { const x = compare(); if (tokens[i++] !== ')') fail('missing )'); return x; }
    if (t === '-') return -primary();
    if (t === '+') return primary();
    if (/^\d/.test(t)) return Number(t);
    if (/^[A-Za-z_]/.test(t)) {
      if (!Object.prototype.hasOwnProperty.call(params, t)) fail(`unknown parameter "${t}"`);
      if (typeof params[t] !== 'number') fail(`parameter "${t}" is text, not a number`);
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

  const CMP = { '<': (a, b) => a < b, '<=': (a, b) => a <= b, '>': (a, b) => a > b,
    '>=': (a, b) => a >= b, '==': (a, b) => a === b, '!=': (a, b) => a !== b };
  function compare() {
    const x = sum();
    if (!CMP[peek()]) return x;
    const op = tokens[i++];
    return CMP[op](x, sum()) ? 1 : 0;
  }

  const result = compare();
  if (i < tokens.length) fail(`unexpected "${tokens[i]}"`);
  if (!Number.isFinite(result)) fail('result is not a finite number');
  return result;
}

/** Parameter names an expression uses (for goals that read run values). */
export function exprNames(v) {
  return typeof v === 'string' ? (v.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []) : [];
}

/** A number as a level shows it: at most 6 decimals, no trailing zeros. */
export const formatNumber = (x) => String(Math.round(x * 1e6) / 1e6);

/**
 * Text with {…} slots: each is a text parameter's name or a number expression,
 * e.g. "{word}", "Faltam {n - 1}". Throws on bad slots.
 */
export function interpolate(text, params = {}) {
  return String(text).replace(/\{([^{}]*)\}/g, (_, inner) => {
    const name = inner.trim();
    if (typeof params[name] === 'string') return params[name];
    return formatNumber(evalNumber(name, params));
  });
}
