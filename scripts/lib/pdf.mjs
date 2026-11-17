// A minimal PDF writer for the printable mats (scripts/levels-mat.mjs): pages of vector
// drawing operators, one shared Form XObject (the mat, drawn once, placed on every
// page), Helvetica text in WinAnsi (PT-PT accents work; no ★ or →). No dependencies.

// Unicode → WinAnsi bytes (as a latin1 string): Latin-1 as is, a few typographic
// marks to their 0x80–0x9F codes, anything else '?'.
const WINANSI = { '\u2013': '\x96', '\u2014': '\x97', '\u2018': '\x91', '\u2019': '\x92', '\u201c': '\x93',
  '\u201d': '\x94', '\u2026': '\x85', '\u2022': '\x95', '\u20ac': '\x80' };
const winAnsi = (s) => [...String(s)].map((ch) => WINANSI[ch] ?? (ch.charCodeAt(0) <= 0xff ? ch : '?')).join('');
const esc = (s) => winAnsi(s).replace(/[\\()]/g, (c) => '\\' + c);

export const PT_PER_CM = 72 / 2.54;
export const PAPER = { a4: [21, 29.7], a3: [29.7, 42] };   // cm, portrait

/** Content-stream builder; all numbers in points unless the caller set a `cm`. */
export class Draw {
  constructor() { this.ops = []; }
  op(s) { this.ops.push(s); return this; }
  n(x) { return Number.isInteger(x) ? String(x) : x.toFixed(3).replace(/0+$/, '').replace(/\.$/, ''); }
  save() { return this.op('q'); }
  restore() { return this.op('Q'); }
  transform(a, b, c, d, e, f) { return this.op([a, b, c, d, e, f].map((v) => this.n(v)).join(' ') + ' cm'); }
  fill([r, g, b]) { return this.op(`${this.n(r / 255)} ${this.n(g / 255)} ${this.n(b / 255)} rg`); }
  stroke([r, g, b]) { return this.op(`${this.n(r / 255)} ${this.n(g / 255)} ${this.n(b / 255)} RG`); }
  width(w) { return this.op(`${this.n(w)} w`); }
  dash(on = 0, off = 0) { return this.op(on ? `[${this.n(on)} ${this.n(off)}] 0 d` : '[] 0 d'); }
  caps(cap = 0, join = 0) { return this.op(`${cap} J ${join} j`); }
  path(points, close = false) {
    points.forEach(([x, y], i) => this.op(`${this.n(x)} ${this.n(y)} ${i ? 'l' : 'm'}`));
    if (close) this.op('h');
    return this;
  }
  rect(x, y, w, h) { return this.op(`${this.n(x)} ${this.n(y)} ${this.n(w)} ${this.n(h)} re`); }
  doFill() { return this.op('f'); }
  doStroke() { return this.op('S'); }
  doFillStroke() { return this.op('B'); }
  clip() { return this.op('W n'); }
  /** Text at (x, y) with font size `size`; `flipY` for a y-down coordinate system. */
  text(x, y, size, s, { flipY = false, bold = false } = {}) {
    const m = flipY ? `1 0 0 -1 ${this.n(x)} ${this.n(y)}` : `1 0 0 1 ${this.n(x)} ${this.n(y)}`;
    return this.op(`BT /${bold ? 'F2' : 'F1'} ${this.n(size)} Tf ${m} Tm (${esc(s)}) Tj ET`);
  }
  form(name) { return this.op(`/${name} Do`); }
  toString() { return this.ops.join('\n'); }
}

/** Approximate Helvetica text width (points), good enough to centre labels. */
export function textWidth(s, size) { return String(s).length * size * 0.52; }

/**
 * Builds the PDF: `pages` = [{ w, h (points), draw: Draw }], `forms` = { name: { w, h, draw } }.
 * Returns a Buffer.
 */
export function buildPdf({ pages, forms = {}, title = '' }) {
  const objs = [];   // index + 1 = object number
  const add = (body) => { objs.push(body); return objs.length; };
  const stream = (dict, content) => {
    const buf = Buffer.from(content, 'latin1');
    return { dict: `${dict} /Length ${buf.length}`, buf };
  };
  const font1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const font2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const fonts = `/Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >>`;
  const formRefs = Object.entries(forms).map(([name, f]) =>
    [name, add(stream(`<< /Type /XObject /Subtype /Form /BBox [0 0 ${f.w} ${f.h}] /Resources << ${fonts} >>`, f.draw.toString()))]);
  const xobjects = formRefs.length ? `/XObject << ${formRefs.map(([n, r]) => `/${n} ${r} 0 R`).join(' ')} >>` : '';
  const pagesRef = objs.length + 1 + pages.length * 2;   // allocated after the pages
  const kids = pages.map((p) => {
    const content = add(stream('<<', p.draw.toString()));
    return add(`<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${p.w} ${p.h}] /Contents ${content} 0 R /Resources << ${fonts} ${xobjects} >> >>`);
  });
  add(`<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`);
  const catalog = add(`<< /Type /Catalog /Pages ${pagesRef} 0 R /ViewerPreferences << /PrintScaling /None >> >>`);
  const info = add(`<< /Title (${esc(title)}) /Producer (mbot2-sim levels:mat) >>`);

  const chunks = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
  let offset = chunks[0].length;
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(offset);
    const parts = typeof o === 'string'
      ? [Buffer.from(`${i + 1} 0 obj\n${o}\nendobj\n`, 'latin1')]
      : [Buffer.from(`${i + 1} 0 obj\n${o.dict} >>\nstream\n`, 'latin1'), o.buf, Buffer.from('\nendstream\nendobj\n', 'latin1')];
    for (const p of parts) { chunks.push(p); offset += p.length; }
  });
  const xref = [`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`, ...offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)].join('');
  chunks.push(Buffer.from(`${xref}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${offset}\n%%EOF\n`, 'latin1'));
  return Buffer.concat(chunks);
}
