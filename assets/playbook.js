// The Vote Loop Playbook: sizes the votes chart and copies templates to the clipboard. The PDF is a prebuilt file
// (tools/make_playbook_pdf.cjs), so there's no print button. No trackers, nothing loaded from other sites.
(() => {
  // the votes chart: each bar is its share of the biggest vote
  const bars = [...document.querySelectorAll('.vb i')];
  const max = Math.max(...bars.map((b) => +b.dataset.v));
  bars.forEach((b) => b.style.setProperty('--v', (+b.dataset.v / max).toFixed(3)));

  // copy buttons
  let viaButton = false;
  document.querySelectorAll('.copy').forEach((btn) => btn.addEventListener('click', async () => {
    const src = document.getElementById(btn.dataset.copy);
    try { await navigator.clipboard.writeText(src.textContent); } catch {
      const r = document.createRange(); r.selectNodeContents(src);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      viaButton = true; document.execCommand('copy'); viaButton = false; s.removeAllRanges();
    }
    btn.textContent = 'Copied'; btn.classList.add('done');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('done'); }, 1600);
  }));

  // copying a long passage by hand brings the source along (the license asks for credit); short quotes stay as they are
  document.addEventListener('copy', (e) => {
    const text = String(getSelection());
    if (viaButton || text.length < 200 || !e.clipboardData) return;
    e.clipboardData.setData('text/plain', `${text}\n\nFrom The Vote Loop Playbook by Arc Lab: https://aviraorigins.github.io/arc-lab/ (free, CC BY-NC 4.0)`);
    e.preventDefault();
  });
})();
