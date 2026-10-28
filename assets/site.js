// Arc Lab's page (waitlist, then shop: it switches by itself at the launch times below): builds the opening's wall of episode covers, reveals sections as they arrive, counts up the big
// numbers, shortens the screenshot wall, marks the menu, darkens the top bar once you scroll, plays the series reel
// while it's on screen, types out the skill's run when it comes into view, opens the waitlist form in a pop-up from every
// "Join the waitlist" button and from the email box at the top, shows the join bar on phones, embeds the Tally form and
// swaps it for the playbook links once you've joined, lets you vote on the real end of Part 1, and shows how many people
// are on the waitlist and how many founding spots are left. No trackers, no other sites except tally.so for the form
// and Google Sheets for the waitlist count.

// The Tally form's id (the part after tally.so/r/).
const TALLY_ID = 'Qoo5r1';

// Founding spots: the first FOUNDING_SPOTS people on the waitlist get FOUNDING_PERK (the founder's promise, shown as
// written). 0 hides the meter.
const FOUNDING_SPOTS = 500;
const FOUNDING_PERK = 'Founding members get in before the rest of the list, and their name goes on the Arc Lab founding wall.';

// The launch, in UTC (the gameplan's times). The page switches by itself: "pre" (waitlist), "founders" (founding members
// are buying), "early" (the whole waitlist is buying; people who join now get the waitlist price), "public" (buy buttons
// for everyone). If Thursday's gate moves the launch, move all four by 24 hours.
const OPENS = { founders: '2026-10-30T01:00:00Z', early: '2026-10-30T13:00:00Z', public: '2026-11-01T14:00:00Z' };
const LIST_PRICE_ENDS = '2026-11-02T13:00:00Z';   // when EARLY40 stops
// Polar checkout links, pasted in on Thursday evening: "public" has no code, "waitlist" has EARLY40 already applied.
// Until "public" is filled in, the page stays in early access even after Sunday, so no buy button ever points nowhere.
const CHECKOUT = { public: '', waitlist: '' };

(() => {
  document.documentElement.classList.add('js');

  // which part of the launch we're in; ?phase=pre|founders|early|public previews one without waiting
  const PHASES = ['pre', 'founders', 'early', 'public'];
  const now = Date.now();
  let PHASE = 'pre';
  if (now >= Date.parse(OPENS.founders)) PHASE = 'founders';
  if (now >= Date.parse(OPENS.early)) PHASE = 'early';
  if (now >= Date.parse(OPENS.public) && CHECKOUT.public) PHASE = 'public';
  const asked = new URLSearchParams(location.search).get('phase');
  if (PHASES.includes(asked)) PHASE = asked;
  const listPriceOn = PHASE === 'early' || (PHASE === 'public' && now < Date.parse(LIST_PRICE_ENDS));
  document.documentElement.dataset.phase = PHASE;
  // dates are shown in the visitor's own time zone
  const TIMES = { ...OPENS, listEnds: LIST_PRICE_ENDS };
  const fmt = (iso) => new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) + ' your time';
  // data-has-link / data-no-link: show a piece only when that checkout link is (or isn't) filled in yet
  const shows = (el) => !el.dataset.show || el.dataset.show.split(' ').includes(PHASE)
    && (!el.hasAttribute('data-list-price') || listPriceOn)
    && (!el.dataset.hasLink || Boolean(CHECKOUT[el.dataset.hasLink]))
    && (!el.dataset.noLink || !CHECKOUT[el.dataset.noLink]);
  const applyPhase = (root) => {
    root.querySelectorAll('[data-show]').forEach((el) => { el.hidden = !shows(el); });
    root.querySelectorAll('[data-buy]').forEach((a) => { const u = CHECKOUT[a.dataset.buy]; if (u) a.href = u; });
    root.querySelectorAll('[data-time]').forEach((el) => { if (TIMES[el.dataset.time]) el.textContent = fmt(TIMES[el.dataset.time]); });
  };
  applyPhase(document);
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

  // the wall of covers behind the opening line. Each column is drawn once, into its own tall strip, and the browser
  // slides the strips itself (a transform animation), so the motion keeps the screen's full frame rate even while the
  // page is busy, sits inside another page, or runs on a phone
  const wall = document.querySelector('.open-wall');
  if (wall) {
    const C = (n) => `assets/yta/cover_p${n}.jpg`, D = (n) => `assets/d23/${n}.jpg`;
    const cols = [
      [C(1), D('cover_a'), C(5), D('hook')],
      [C(2), C(6), D('cover_b'), D('almost')],
      [C(3), D('vote'), C(7), D('cover_c')],
      [C(4), C(8), D('cover_a'), C(1)],
      [D('cover_b'), C(5), C(2), D('hook')],
      [C(6), D('almost'), C(3), C(8)],
      [D('cover_c'), C(4), D('vote'), C(7)],
    ];
    const box = wall.parentElement;
    const imgs = new Map();
    let W = 0, H = 0, dpr = 1, strips = [], onScreen = true, wait = 0;
    const paint = (s, src) => {                            // one cover into every slot of a strip that shows it
      const im = imgs.get(src);
      if (!im || !im.complete || !im.naturalWidth) return;
      const g = s.cv.getContext('2d'), { cw, ch, cell, shade } = s;
      const w = Math.round(cw * dpr), h = Math.round(ch * dpr), r = Math.min(18, cw * 0.07) * dpr;
      for (let k = 0; k < s.slots; k++) {
        if (s.list[k % s.list.length] !== src) continue;
        const y = Math.round(k * cell * dpr);
        g.save();
        g.beginPath();
        if (g.roundRect) g.roundRect(0, y, w, h, r); else g.rect(0, y, w, h);
        g.clip();
        g.drawImage(im, 0, y, w, h);
        g.fillStyle = `rgba(5, 5, 6, ${shade})`;
        g.fillRect(0, y, w, h);
        g.restore();
      }
    };
    const run = () => strips.forEach((s) => s.anim && (onScreen ? s.anim.play() : s.anim.pause()));
    const build = () => {
      const r = box.getBoundingClientRect(), d = Math.min(1.5, window.devicePixelRatio || 1);
      if (!r.width || !r.height) return;
      if (r.width === W && d === dpr && r.height <= H * 1.15) return;   // a phone's address bar: the strips still reach
      W = r.width;
      H = r.height;
      dpr = d;
      strips.forEach((s) => s.anim && s.anim.cancel());
      const n = W <= 680 ? 3 : W <= 980 ? 5 : W <= 1200 ? 6 : 7;
      const shade = n === 3 ? 0.46 : 0.3;                  // phones: the line sits over more of the wall
      const gap = Math.max(10, Math.min(20, W * 0.013));
      const cw = (W * (n === 3 ? 1.48 : 1.2) - gap * (n - 1)) / n;   // wider than the screen, so the tilt never shows an edge
      const ch = cw * 16 / 9, cell = ch + gap, x0 = (W - (n * cw + (n - 1) * gap)) / 2;
      const tilt = document.createElement('div');
      tilt.className = 'ow-tilt';
      strips = [];
      for (let c = 0; c < n; c++) {
        const list = cols[c], loop = list.length * cell;
        const slots = Math.ceil((1.9 * H + loop) / cell) + 1;
        const cv = document.createElement('canvas');
        cv.className = 'ow-strip';
        cv.width = Math.round(cw * dpr);
        cv.height = Math.round(slots * cell * dpr);
        cv.style.cssText = `left:${x0 + c * (cw + gap)}px;top:${-0.45 * H}px;width:${cw}px;height:${slots * cell}px`;
        tilt.appendChild(cv);
        const s = { cv, list, slots, cw, ch, cell, shade, anim: null };
        if (!reduce && cv.animate) {
          const speed = 22 + c * 3, dur = loop / speed * 1000;   // px a second; neighbours run opposite ways
          s.anim = cv.animate([{ transform: 'translate3d(0, 0, 0)' }, { transform: `translate3d(0, ${-loop}px, 0)` }],
            { duration: dur, iterations: Infinity, easing: 'linear', direction: c % 2 ? 'reverse' : 'normal' });
          s.anim.currentTime = (c * 211 / speed * 1000) % dur;
        }
        strips.push(s);
        new Set(list).forEach((src) => paint(s, src));
      }
      wall.replaceChildren(tilt);
      run();
    };
    [...new Set(cols.flat())].forEach((src) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => strips.forEach((s) => { if (s.list.includes(src)) paint(s, src); });
      im.src = src;
      imgs.set(src, im);
    });
    build();
    const later = () => { clearTimeout(wait); wait = setTimeout(build, 150); };
    if ('ResizeObserver' in window) new ResizeObserver(later).observe(box);
    else addEventListener('resize', later);
    if (hasIO) seen(box, (on) => { onScreen = on; run(); }, 0);   // the covers only move while you can see them
  }

  // the big numbers count up once, the first time they're on screen (ranges like 70-80% stay as they are)
  document.querySelectorAll('.figures b').forEach((b) => {
    const m = b.textContent.trim().match(/^([\d.,]+)(\D*)$/);
    if (!m || reduce || !hasIO) return;
    const end = parseFloat(m[1].replace(/,/g, '')), dec = (m[1].split('.')[1] || '').length, tail = m[2], comma = m[1].includes(',');
    const fmt = (v) => (comma ? Math.round(v).toLocaleString('en-US') : v.toFixed(dec)) + tail;
    let done = false;
    seen(b, (on) => {
      if (!on || done) return;
      done = true;
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 1300);
        b.textContent = fmt(end * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      setTimeout(() => { b.textContent = fmt(end); }, 1400);   // lands on the real number even if frames stall
    }, 0.6);
  });

  // the screenshot wall starts with six; the button shows the rest
  const shots = document.querySelector('.wall'), more = document.querySelector('.wall-more');
  if (shots && more && shots.children.length > 6) {
    const label = () => (shots.classList.contains('short') ? `Show all ${shots.children.length} screenshots` : 'Show fewer');
    shots.classList.add('short');
    more.hidden = false;
    more.textContent = label();
    more.setAttribute('aria-expanded', 'false');
    more.addEventListener('click', () => {
      const short = shots.classList.toggle('short');
      more.textContent = label();
      more.setAttribute('aria-expanded', String(!short));
      if (short) shots.scrollIntoView({ block: 'start' });
    });
  }

  // the menu marks the part of the page you're reading
  const navLinks = [...document.querySelectorAll('.bar-nav a')];
  if (navLinks.length && hasIO) {
    const bySection = new Map(navLinks.map((a) => [document.querySelector(a.getAttribute('href')), a]).filter(([sec]) => sec));
    const spy = new IntersectionObserver((es) => es.forEach((e) => bySection.get(e.target).classList.toggle('on', e.isIntersecting)), { rootMargin: '-45% 0px -50% 0px' });
    bySection.forEach((a, sec) => spy.observe(sec));
  }

  // the top bar turns to dark glass once the opening shot has scrolled a little
  const bar = document.querySelector('.bar');
  const heroBtn = PHASE === 'public' ? document.querySelector('.hero-buy .pill') : document.querySelector('.hero-join .pill');
  const joinSec = document.getElementById('join');
  const sticky = [...document.querySelectorAll('.sticky-cta')].find(shows);
  // phones: the bar hides while the part it points to is on screen (the offer, or the prices once the shop is open)
  const stickyGoal = PHASE === 'public' ? document.getElementById('pricing') : joinSec;
  if (sticky && heroBtn && stickyGoal) sticky.hidden = false;
  // runs at most once per frame, so scrolling never waits on it
  let queued = false;
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  const update = () => {
    queued = false;
    if (bar) bar.classList.toggle('solid', scrollY > 40);
    if (sticky && heroBtn && stickyGoal) {
      // phones: the bar shows once the opening button has gone, and hides while its goal is on screen
      const j = stickyGoal.getBoundingClientRect();
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
  const FORM_URL = `https://tally.so/embed/${TALLY_ID}?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1`;
  function mount(slot, prefill = '') {
    if (!ready || !slot) return;
    if (slot.dataset.mounted) {                       // already there: reload it with the new answers filled in
      const old = slot.querySelector('iframe');
      if (old && prefill) { if (old.getAttribute('src')) old.src = FORM_URL + prefill; else old.dataset.tallySrc = FORM_URL + prefill; }
      return;
    }
    slot.dataset.mounted = '1';
    const f = document.createElement('iframe');
    f.dataset.tallySrc = FORM_URL + prefill;
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
      const panel = joined.content.cloneNode(true);
      applyPhase(panel);
      slot.replaceChildren(panel);
    });
    try { localStorage.setItem('arclab-joined', '1'); } catch { /* private window: the panel just won't come back */ }
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
  // someone who joined earlier in this browser sees their playbook links (and, in early access, their 40% link) again
  let joinedBefore = false;
  try { joinedBefore = localStorage.getItem('arclab-joined') === '1'; } catch { /* storage blocked: show the form */ }
  if (joinedBefore) showJoined();
  else seen(joinSec, (on) => { if (on) mount(joinSec.querySelector('.form-slot')); }, 0.01);

  // every "Join the waitlist" opens the form in a pop-up (without dialog support it scrolls to the offer instead)
  const dlg = document.getElementById('join-dialog');
  const hasDialog = dlg && typeof dlg.showModal === 'function';
  const openJoin = (prefill = '') => {
    if (hasDialog) { mount(dlg.querySelector('.form-slot'), prefill); dlg.showModal(); return; }
    mount(joinSec.querySelector('.form-slot'), prefill);
    joinSec.scrollIntoView();
  };
  if (hasDialog) {
    document.querySelectorAll('[data-join]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); openJoin(); }));
    dlg.querySelector('.jd-close').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });   // a tap on the backdrop
  }

  // the email box at the top: check the email, then open the form with it (and the series idea, if any) filled in
  const heroJoin = document.getElementById('hero-join');
  if (heroJoin) {
    const row = heroJoin.querySelector('.hj-row'), email = heroJoin.querySelector('#hj-email');
    const idea = heroJoin.querySelector('#hj-idea'), err = heroJoin.querySelector('.hj-err');
    heroJoin.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        err.textContent = 'Type your email first.';
        row.classList.add('err');
        email.focus();
        return;
      }
      err.textContent = '';
      row.classList.remove('err');
      const fill = { email: v };
      if (idea.value.trim()) fill.idea = idea.value.trim();
      openJoin('&' + new URLSearchParams(fill).toString());
    });
  }

  // vote on the real end of Part 1: the bars fill to the real poll, then Part 2 shows what the vote made
  const vd = document.querySelector('.vd');
  if (vd) {
    const opts = [...vd.querySelectorAll('.vd-opt')], verdict = vd.querySelector('.vd-verdict'), next = vd.querySelector('.vd-next');
    opts.forEach((b) => b.addEventListener('click', () => {
      if (vd.classList.contains('voted')) return;
      vd.classList.add('voted');
      b.classList.add('mine');
      opts.forEach((o) => {
        o.setAttribute('aria-pressed', String(o === b));
        o.querySelector('.vd-fill').style.width = o.dataset.pct + '%';
      });
      const pct = Number(b.dataset.pct);
      verdict.innerHTML = pct >= 50
        ? `You voted with <b>${pct}%</b> of 14,400 people.`
        : `Bold. Only <b>${pct}%</b> of 14,400 people voted with you.`;
      setTimeout(() => { next.hidden = false; }, reduce ? 0 : 900);
    }));
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
  // founding spots left, from the same count: the bar fills as the list grows, and says so once they're all taken
  const founding = document.getElementById('founding');
  const showFounding = (n) => {
    if (!founding || !(FOUNDING_SPOTS > 0) || !FOUNDING_PERK || PHASE === 'public') return;
    const left = Math.max(0, FOUNDING_SPOTS - n);
    founding.querySelector('.fd-cap').textContent = FOUNDING_SPOTS.toLocaleString('en-US');
    const b = document.createElement('b');
    b.textContent = left.toLocaleString('en-US');
    founding.querySelector('.fd-left').replaceChildren(...(left ? [b, ' left'] : ['All taken']));
    founding.querySelector('.fd-perk').textContent = left ? FOUNDING_PERK : 'Everyone on the list still gets 40% off and 48 hours early.';
    founding.hidden = false;
    const fill = () => { founding.querySelector('.fd-bar i').style.width = `${Math.min(100, (n / FOUNDING_SPOTS) * 100).toFixed(1)}%`; };
    if (reduce || !hasIO) fill(); else seen(founding, (on) => { if (on) fill(); }, 0.4);
  };
  if (lives.length || founding) getCount().then((d) => {
    const n = d && Number.isInteger(d.count) ? d.count : 0;
    if (n < MIN_SHOWN) return;
    showFounding(n);
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
      if (!shows(p)) return;
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
