// Text extraction for PDF (pdf.js, main-thread worker) and DOCX (mammoth), loaded on demand from cdnjs/jsDelivr.
const Extract = (() => {
  const loaded = {};
  const load = src => loaded[src] ||= new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load the reader library')); document.head.append(s); });
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  async function pdf(file, onProgress) {
    await load(PDFJS + 'pdf.min.js');
    await load(PDFJS + 'pdf.worker.min.js');
    const lib = window.pdfjsLib;
    lib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
    const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
    const out = [];
    for (let p = 1; p <= doc.numPages; p++) {
      onProgress && onProgress({ page: p, pages: doc.numPages });
      const tc = await (await doc.getPage(p)).getTextContent();
      let lastY = null, lastH = 12, line = '';
      const lines = [];
      for (const it of tc.items) {
        const y = it.transform[5], hgt = Math.abs(it.transform[3]) || lastH;
        if (lastY !== null && Math.abs(y - lastY) > hgt * 0.5) {
          lines.push(line); line = '';
          if (Math.abs(lastY - y) > lastH * 1.75) lines.push('');
        }
        line += it.str;
        if (it.hasEOL) { lines.push(line); line = ''; }
        lastY = y; lastH = hgt || lastH;
      }
      if (line) lines.push(line);
      out.push(lines.join('\n'));
    }
    return out.join('\n\n');
  }
  async function docx(file) {
    await load('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js');
    const r = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return r.value;
  }
  return { pdf, docx };
})();
