// Arc Lab waitlist page: reveals sections as they arrive, darkens the top bar once you scroll, plays the series reel
// while it's on screen, types out the skill's run when it comes into view, opens the waitlist form in a pop-up from every
// "Join the waitlist" button, shows the join bar on phones, embeds the Tally form and swaps it for the playbook links once
// you've joined, and shows how many people are on the waitlist. No trackers, no other sites except tally.so for the form
// and Google Sheets for the waitlist count.

// The Tally form's id (the part after tally.so/r/).
const TALLY_ID = 'Qoo5r1';

(() => {
  document.documentElement.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;
  const seen = (el, fn, threshold = 0.4) => {
    if (!el) return;
    if (!hasIO) { fn(true); return; }
    new IntersectionObserver((es) => es.forEach((e) => fn(e.isIntersecting)), { threshold }).observe(el);
  };

  // things rise gently as they arrive; neighbours follow a beat apart
  const cards = [...document.querySelectorAll('.rv')];
  if (reduce || !hasIO) cards.forEach((el) => el.classList.add('in'));
  else {
    cards.forEach((el) => {
      const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('rv'));
      el.style.transitionDelay = Math.min(sibs.indexOf(el), 3) * 90 + 'ms';
    });
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    cards.forEach((el) => io.observe(el));
  }

  // the top bar turns to dark glass once the opening shot has scrolled a little
  const bar = document.querySelector('.bar');
  const heroBtn = document.querySelector('.open-cta .pill');
  const joinSec = document.getElementById('join');
  const sticky = document.querySelector('.sticky-cta');
  if (sticky && heroBtn && joinSec) sticky.hidden = false;
  const onScroll = () => {
    if (bar) bar.classList.toggle('solid', scrollY > 40);
    if (sticky && heroBtn && joinSec) {
      // phones: the join bar shows once the opening button has gone, and hides while the offer is on screen
      const j = joinSec.getBoundingClientRect();
      const pastHero = heroBtn.getBoundingClientRect().bottom < 0;
      const atOffer = j.top < innerHeight && j.bottom > 0;
      sticky.classList.toggle('show', pastHero && !atOffer);
    }
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  // the series reel: a silent loop while it's on screen; with reduced motion it keeps its controls and waits for a tap
  const reel = document.getElementById('reel');
  if (reel && !reduce) {
    reel.controls = false;
    seen(reel, (on) => { if (on) reel.play().catch(() => { reel.controls = true; }); else reel.pause(); }, 0.25);
  }

  // the skill's run: the idea types itself, then each step lands
  const term = document.getElementById('term');
  if (term) {
    const typed = term.querySelector('.t-typed');
    const idea = typed.textContent;
    const lines = [...term.querySelectorAll('.t-ln')];
    const finish = () => { typed.textContent = idea; term.classList.remove('typing'); lines.forEach((l) => l.classList.add('on')); };
    if (reduce || !hasIO) finish();
    else {
      typed.textContent = '';
      let started = false;
      seen(term, (on) => {
        if (!on || started) return;
        started = true;
        term.classList.add('typing');
        let i = 0;
        const type = () => {
          typed.textContent = idea.slice(0, ++i);
          if (i < idea.length) setTimeout(type, idea[i - 1] === ' ' ? 42 : 26);
          else setTimeout(() => {
            term.classList.remove('typing');
            lines.forEach((l, k) => setTimeout(() => l.classList.add('on'), 380 + k * 520));
          }, 300);
        };
        setTimeout(type, 400);
      }, 0.35);
    }
  }

  // the Tally form, put into a slot the first time it's needed. Tally's own embed script (fetched then, not before)
  // sizes the frame to the form; if it can't load, the form still shows at a fixed height
  const frames = [];
  const ready = TALLY_ID && /^[A-Za-z0-9]+$/.test(TALLY_ID);
  const EMBED_JS = 'https://tally.so/widgets/embed.js';
  const loadEmbeds = () => {
    if (window.Tally) window.Tally.loadEmbeds();
    else document.querySelectorAll('iframe[data-tally-src]:not([src])').forEach((f) => { f.src = f.dataset.tallySrc; });
  };
  function mount(slot) {
    if (!ready || !slot || slot.dataset.mounted) return;
    slot.dataset.mounted = '1';
    const f = document.createElement('iframe');
    f.dataset.tallySrc = `https://tally.so/embed/${TALLY_ID}?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1`;
    f.title = 'Join the Arc Lab waitlist';
    f.height = '560';
    slot.replaceChildren(f);
    frames.push(f);
    if (window.Tally || document.querySelector(`script[src="${EMBED_JS}"]`)) { loadEmbeds(); return; }
    const s = document.createElement('script');
    s.src = EMBED_JS;
    s.onload = s.onerror = loadEmbeds;
    document.head.append(s);
  }
  // once someone joins, every form on the page becomes the playbook links (Tally's free plan can't email them)
  const joined = document.getElementById('joined');
  function showJoined(from) {
    if (!joined) return;
    document.querySelectorAll('.form-slot').forEach((slot) => {
      slot.dataset.mounted = '1';
      slot.replaceChildren(joined.content.cloneNode(true));
    });
    frames.length = 0;
    const panel = from && from.querySelector('.joined');
    if (panel) panel.focus();
  }
  // Tally says when a form has been sent
  addEventListener('message', (e) => {
    if (e.origin !== 'https://tally.so' || typeof e.data !== 'string' || !e.data.includes('Tally.FormSubmitted')) return;
    let d;
    try { d = JSON.parse(e.data); } catch { return; }
    const f = frames.find((x) => x.contentWindow === e.source);
    if (f && d.event === 'Tally.FormSubmitted') showJoined(f.closest('.form-slot'));
  });
  seen(joinSec, (on) => { if (on) mount(joinSec.querySelector('.form-slot')); }, 0.01);

  // every "Join the waitlist" opens the form in a pop-up (without dialog support it scrolls to the offer instead)
  const dlg = document.getElementById('join-dialog');
  if (dlg && typeof dlg.showModal === 'function') {
    const open = (e) => {
      e.preventDefault();
      mount(dlg.querySelector('.form-slot'));
      dlg.showModal();
    };
    document.querySelectorAll('[data-join]').forEach((a) => a.addEventListener('click', open));
    dlg.querySelector('.jd-close').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });   // a tap on the backdrop
  }

  // how many people have joined. Tally copies every sign-up into the founder's Google Sheet; one small tab of it, holding
  // only the total (first line) and the join times in UTC (newest first, "2026-10-27 09:12"), is published as CSV.
  // No email is ever in it. The lines stay hidden below MIN_SHOWN, or if the tab can't be read
  const MIN_SHOWN = 25;
  const COUNT_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSFZ1AwNDFjFiIo-w-PjaCawGu2hF92zC36KOYH2eGIQSw4wgJeoLSRwKWtoXte-_IHOZljHzx8xp1J/pub?gid=279976421&single=true&output=csv';
  const lives = [...document.querySelectorAll('[data-live]')];
  const getCount = async () => {
    if (!COUNT_CSV) return null;
    try {
      const r = await fetch(COUNT_CSV, { cache: 'no-cache' });
      if (!r.ok) return null;
      const rows = (await r.text()).split(/\r?\n/).map((l) => l.replace(/"/g, '').trim()).filter(Boolean);
      return { count: parseInt((rows[0] || '').replace(/\D/g, ''), 10), recent: rows.slice(1) };
    } catch { return null; }
  };
  // "2026-10-27 09:12" is UTC; anything else (an ISO time) is read as it is
  const when = (s) => Date.parse(/^\d{4}-\d\d-\d\d \d\d:\d\d(:\d\d)?$/.test(s) ? s.replace(' ', 'T') + 'Z' : s);
  const ago = (ms) => {
    const m = Math.round(ms / 6e4), h = Math.round(ms / 36e5);
    if (m < 2) return 'just now';
    if (m < 60) return `${m} minutes ago`;
    return h < 2 ? 'an hour ago' : `${h} hours ago`;
  };
  // the number counts up to the real total the first time it's on screen (until then it shows the real total)
  const countUp = (b, n) => {
    b.textContent = n.toLocaleString('en-US');
    if (reduce || !hasIO || n < 40) return;
    const from = Math.round(n * 0.8);
    let done = false;
    seen(b, (on) => {
      if (!on || done) return;
      done = true;
      b.textContent = from.toLocaleString('en-US');
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 1400);
        b.textContent = Math.round(from + (n - from) * (1 - Math.pow(1 - k, 3))).toLocaleString('en-US');
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      setTimeout(() => { b.textContent = n.toLocaleString('en-US'); }, 1500);   // lands on the real total even if frames stall
    }, 0.6);
  };
  if (lives.length) getCount().then((d) => {
    const n = d && Number.isInteger(d.count) ? d.count : 0;
    if (n < MIN_SHOWN) return;
    const times = d.recent.map(when).filter((t) => t <= Date.now()).sort((a, b) => b - a);
    const today = times.filter((t) => Date.now() - t < 864e5).length;
    const last = times.length && Date.now() - times[0] < 864e5 ? ago(Date.now() - times[0]) : '';
    const say = {
      // "236 on the waitlist · 236 joined today" reads oddly while the whole list is under a day old
      hero: ['', ' on the waitlist', today >= 3 && today < n ? `${today} joined today` : last ? `last joined ${last}` : ''],
      offer: ['', ' people have joined', last ? `the last one ${last}` : ''],
      dialog: ['Join ', ' people already on the list.', ''],
    };
    lives.forEach((p) => {
      const [before, after, extra] = say[p.dataset.live] || say.offer;
      const dot = document.createElement('i');
      dot.setAttribute('aria-hidden', 'true');
      const b = document.createElement('b');
      const text = document.createElement('span');
      text.append(before, b, after);
      if (extra) {                                    // on a narrow phone this part drops to its own line, whole
        const more = document.createElement('span');
        more.className = 'live-more';
        more.textContent = extra;
        text.append(' ', more);
      }
      p.replaceChildren(dot, text);
      countUp(b, n);
      p.hidden = false;
    });
  });
})();
