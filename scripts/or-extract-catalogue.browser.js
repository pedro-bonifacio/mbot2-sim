// Browser snippet: extracts the Open Roberta Lab mBot 2 block catalogue.
//
// How to run (manually or via browser automation):
//   1. Open https://lab.open-roberta.org/?loadSystem=mbot2
//   2. Switch the language to Português (top menu → language → pt).
//   3. Paste this whole file into the DevTools console and press Enter.
//   4. A file `or-mbot2-catalogue.json` downloads. Save it to
//      reference_openroberta/live/or-mbot2-catalogue.json and run `npm run or:check`.
//
// What it captures, for both toolboxes (beginner + expert):
//   - the raw toolbox XML as served for mBot 2,
//   - every toolbox block instantiated with its defaults: inputs, fields, dropdown
//     options (label + value), hidden fields, colour, connections, and the XML that
//     Open Roberta itself serialises for it,
//   - variable/procedure/start block definitions (not in the toolbox XML),
//   - the default robot configuration and configuration toolbox,
//   - all Blockly.Msg strings in the current language.
//
// Note: OR's Blockly fork takes an extra list argument in Xml.blockToDom(block, list).

(async () => {
  const B = Blockly, GS = require('guiState.controller'), GM = require('guiState.model');
  const ws = B.getMainWorkspace();
  B.Events.disable();
  const toXml = b => B.Xml.domToText(B.Xml.blockToDom(b, []));
  const optsOf = f => {
    try {
      const raw = f.getOptions ? f.getOptions() : (typeof f.menuGenerator_ === 'function' ? f.menuGenerator_() : f.menuGenerator_);
      return raw.map(o => [typeof o[0] === 'string' ? o[0] : (o[0] && o[0].alt) || '[img]', o[1]]);
    } catch (e) { return 'ERR ' + e; }
  };
  const isDrop = f => f instanceof B.FieldDropdown;
  const fieldInfo = f => ({
    name: f.name || null,
    kind: isDrop(f) ? 'dropdown' : (f instanceof B.FieldTextInput ? 'text' : (f.name ? 'field' : 'label')),
    value: f.getValue ? f.getValue() : null,
    text: f.getText ? f.getText() : null,
    options: isDrop(f) ? optsOf(f) : undefined,
    visible: f.isVisible ? f.isVisible() : true,
  });
  const shape = b => b.inputList.map(i => ({
    name: i.name || null, type: i.type,
    check: i.connection && i.connection.check_ ? i.connection.check_ : null,
    visible: i.isVisible ? i.isVisible() : true,
    fields: i.fieldRow.map(fieldInfo),
  }));
  const describe = b => ({
    type: b.type, output: !!b.outputConnection, outputCheck: (b.outputConnection && b.outputConnection.check_) || null,
    prev: !!b.previousConnection, next: !!b.nextConnection, colour: b.getColour && b.getColour(),
    inputsInline: b.inputsInline, hide: b.hide || null, shape: shape(b), xml: toXml(b),
    text: (() => { try { return b.toString(); } catch (e) { return null; } })(),
  });
  const walk = (node, path, out) => {
    for (const c of node.children) {
      const tag = c.tagName.toLowerCase();
      if (tag === 'category') walk(c, path.concat(c.getAttribute('name')), out);
      else if (tag === 'block') out.push({ path, dom: c });
    }
  };
  const sigOf = s => JSON.stringify(s.map(i => [i.name, i.type, i.visible, i.fields.map(f => [f.name, f.visible])]));

  const result = {
    meta: { source: 'https://lab.open-roberta.org', robot: GS.getRobot(), lang: GS.getLanguage(), extractedAt: new Date().toISOString(), blocklyBlockTypes: Object.keys(B.Blocks).length },
    toolboxes: {}, extraTypes: {},
    configuration: { default: GS.getConfigurationXML(), toolbox: String(GM.gui.configuration.toolbox) },
    errors: [],
  };

  for (const lvl of ['beginner', 'expert']) {
    const raw = String(GS.getToolbox(lvl));
    result.toolboxes[lvl] = { raw, blocks: [] };
    const root = new DOMParser().parseFromString(raw, 'text/xml').documentElement;
    const items = []; walk(root, [], items);
    for (const { path, dom } of items) {
      const t = new XMLSerializer().serializeToString(dom);
      const entry = { path, toolboxXml: t };
      try {
        const b = B.Xml.domToBlock(dom.cloneNode(true), ws);
        Object.assign(entry, describe(b));
        // Record dropdown values that change the block's shape (dynamic blocks).
        const base = sigOf(entry.shape); const variants = [];
        for (const inp of b.inputList) for (const f of inp.fieldRow) {
          if (!isDrop(f) || !f.name) continue;
          const opts = optsOf(f); if (!Array.isArray(opts)) continue;
          for (const [lab, val] of opts) {
            const b2 = B.Xml.domToBlock(dom.cloneNode(true), ws);
            try { b2.setFieldValue(val, f.name); } catch (e) {}
            const d = describe(b2);
            if (sigOf(d.shape) !== base) variants.push({ field: f.name, value: val, label: lab, shape: d.shape, xml: d.xml });
            b2.dispose(false);
          }
        }
        if (variants.length) entry.variants = variants;
        b.dispose(false);
      } catch (e) { entry.error = String(e); result.errors.push(t.slice(0, 60) + ' :: ' + e); }
      result.toolboxes[lvl].blocks.push(entry);
    }
  }

  const EXTRA = /^(robControls_start|robGlobalVariables|robLocalVariables|variables_|robProcedures|procedures_)/;
  for (const t of Object.keys(B.Blocks).filter(k => EXTRA.test(k))) {
    try { const b = ws.newBlock(t); if (b.initSvg) b.initSvg(); result.extraTypes[t] = describe(b); b.dispose(false); }
    catch (e) { result.extraTypes[t] = { error: String(e) }; }
  }
  result.allBlockTypes = Object.keys(B.Blocks).sort();
  result.msgPt = Object.assign({}, B.Msg);
  B.Events.enable();

  const blob = new Blob([JSON.stringify(result, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'or-mbot2-catalogue.json';
  document.body.appendChild(a); a.click(); a.remove();
  console.log('[or-extract] done', { beginner: result.toolboxes.beginner.blocks.length, expert: result.toolboxes.expert.blocks.length, errors: result.errors.length });
})();
