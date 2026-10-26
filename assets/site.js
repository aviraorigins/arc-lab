// Arc Lab waitlist page: reveals sections as they arrive, darkens the top bar once you scroll, plays the series reel
// while it's on screen, types out the skill's run when it comes into view, opens the waitlist form in a pop-up from every
// "Join the waitlist" button, shows the join bar on phones, embeds the Tally form and swaps it for the playbook links once
// you've joined. No trackers, no other sites except tally.so for the form.

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
})();
