// The Vote Loop Playbook: sizes the votes chart and copies templates to the clipboard. The PDF is a prebuilt file
// (tools/make_playbook_pdf.cjs), so there's no print button. No trackers, nothing loaded from other sites.
(() => {
  // the votes chart: each bar is its share of the biggest vote
  const bars = [...document.querySelectorAll('.vb i')];
  const max = Math.max(...bars.map((b) => +b.dataset.v));
  bars.forEach((b) => b.style.setProperty('--v', (+b.dataset.v / max).toFixed(3)));

  // copy buttons
  document.querySelectorAll('.copy').forEach((btn) => btn.addEventListener('click', async () => {
    const src = document.getElementById(btn.dataset.copy);
    try { await navigator.clipboard.writeText(src.textContent); } catch {
      const r = document.createRange(); r.selectNodeContents(src);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); s.removeAllRanges();
    }
    btn.textContent = 'Copied'; btn.classList.add('done');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('done'); }, 1600);
  }));
})();
