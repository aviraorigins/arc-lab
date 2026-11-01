// The founding wall: the names founding members chose to show. Tally copies each wall-form answer into the founder's
// Google Sheet; one small tab of it, holding only the names (one per line, in the order they were added), is published
// as CSV. No email is ever in it. Names go on the page as text, never as HTML.
(() => {
  const WALL_CSV = '';
  const MIN_STRIP = 10;   // the home page line stays hidden until this many names are in
  const list = document.getElementById('wall-names');
  const strips = [...document.querySelectorAll('[data-wall-strip]')];
  if (!list && !strips.length) return;
  if (!WALL_CSV) {
    const e = document.getElementById('wall-empty');
    if (e) e.textContent = 'The wall opens soon. Names added with the form will show here then.';
  }

  // one CSV cell per line: "Sam ""the pilot"" Lee" -> Sam "the pilot" Lee
  const cell = (line) => {
    const s = line.trim();
    return s.startsWith('"') ? s.slice(1, s.endsWith('"') ? -1 : undefined).replace(/""/g, '"') : s;
  };
  // the sheet already drops non-founders, hidden names, links and emails; this is a second guard, plus sheet errors
  const BAD = /^(#(N\/A|REF!|VALUE!|NAME\?|DIV\/0!|NUM!|NULL!|ERROR!)|Loading\.\.\.)$/i;
  const ok = (n) => n && !BAD.test(n) && !/@|https?:|www\.|\.(com|net|org|io|gg|me|ly)\b/i.test(n);
  const cut = (n) => { const c = [...n]; return c.length > 32 ? `${c.slice(0, 31).join('')}…` : n; };
  const load = async () => {
    if (!WALL_CSV) return [];
    try {
      const r = await fetch(WALL_CSV, { cache: 'no-cache' });
      if (!r.ok) return [];
      return (await r.text()).split(/\r?\n/).map(cell).map((n) => n.replace(/\s+/g, ' ').trim()).filter(ok)
        .map(cut);
    } catch { return []; }
  };

  load().then((names) => {
    const n = names.length;
    if (list) {
      list.replaceChildren(...names.map((name) => {
        const li = document.createElement('li');
        li.textContent = name;
        return li;
      }));
      list.hidden = !n;
      const count = document.getElementById('wall-count');
      if (count) count.textContent = n ? `${n.toLocaleString('en-US')} founding ${n === 1 ? 'member has' : 'members have'} added their name so far.` : '';
      const empty = document.getElementById('wall-empty');
      if (empty) empty.hidden = n > 0;
    }
    // only the count here: people agreed to show their name on the wall page, not on the sales page
    if (n >= MIN_STRIP) strips.forEach((p) => {
      p.querySelector('[data-wall-names]').textContent = `${n.toLocaleString('en-US')} founding members`;
      p.hidden = false;
    });
  });
})();
