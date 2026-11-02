// Visit counting and link tags, on every page (2 Nov 2026, founder: "Yes, do both"). Two jobs:
// 1. Where a visit came from rides along: the link's utm_* tags (or, without them, the site that sent the visitor) go
//    onto our own links, the Polar checkout links and the sign-up form, so a sale or a sign-up shows which post led to
//    it. Nothing is saved on the device: the tags live only in the links.
// 2. Umami counts visits and a few taps (buy, join, the playbook, the Day 23 episode watched to the end). It sets no
//    cookies and saves nothing on the device. It never sees what anyone types. Nothing is counted on our own previews,
//    with ?phase=, for browsers that ask not to be tracked (Do Not Track, Global Privacy Control), or after the
//    "Turn counting off" button on the privacy page.

// The Umami website id (Umami → Websites → arclabstudios.com → Edit). Empty: nothing is counted, the tags still work.
const UMAMI_ID = 'fccdde47-3397-4af7-b111-3f4e35febe3c';
const UMAMI_JS = 'https://cloud.umami.is/script.js';
const SITE_HOST = 'arclabstudios.com';

(() => {
  const params = new URLSearchParams(location.search);

  // 1. where this visit came from: the link's own tags; failing that, the site that sent it (Instagram, YouTube…).
  // Instagram's link sticker leaves a "#join" inside the last tag, so anything after a # is cut off
  const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  let tags = KEYS.filter((k) => params.get(k)).map((k) => [k, params.get(k).split('#')[0].slice(0, 80)]).filter(([, v]) => v);
  if (!tags.length && document.referrer) {
    try {
      // a phone app sends its own name (android-app://com.google.android.gm is the Gmail app)
      const host = new URL(document.referrer).hostname.replace(/^(www|m|l|lm|mobile)\./, '');
      const NAMES = [[/instagram/, 'instagram'], [/youtube|youtu\.be/, 'youtube'], [/^mail\.google\.|android\.gm$/, 'gmail'],
        [/(^|\.)google\./, 'google'], [/facebook|fb\.com/, 'facebook'], [/tiktok/, 'tiktok'],
        [/(^|\.)(x|twitter|t)\.(com|co)$/, 'x'], [/discord/, 'discord']];
      const named = NAMES.find(([re]) => re.test(host));
      // our own site, the checkout and the form send people back here; they aren't where a visit started
      const ours = host === location.hostname || host === SITE_HOST || /(^|\.)(polar\.sh|tally\.so|stripe\.com)$/.test(host);
      if (host && !ours) tags = [['utm_source', named ? named[1] : host], ['utm_medium', 'referral']];
    } catch { /* not a web address: no source */ }
  }
  // Instagram's own browser often sends no site at all
  if (!tags.length && /\bInstagram\b/.test(navigator.userAgent)) tags = [['utm_source', 'instagram'], ['utm_medium', 'app']];
  // the tags as they leave for Polar or the form; place = which of our buttons was tapped. A link's own utm_content
  // (say "story3") stays in front: story3.hero
  const linkTags = (place) => {
    const out = new URLSearchParams(tags);
    if (place) out.set('utm_content', out.get('utm_content') ? `${out.get('utm_content')}.${place}` : place);
    return out;
  };
  // a link with the tags added (keeps its own #part); same-page jumps (#pricing) are left alone
  const withTags = (href, place) => {
    const extra = linkTags(place);
    if (![...extra].length) return href;
    try {
      const u = new URL(href, location.href);
      extra.forEach((v, k) => u.searchParams.set(k, v));
      return u.origin === location.origin ? u.pathname + u.search + u.hash : u.href;
    } catch { return href; }
  };
  window.arcTags = { linkTags, withTags };

  // our own links carry the tags to the next page, so a visit that starts on the playbook still knows its source.
  // Done at the tap (or the long press / right click that opens a link elsewhere), so links added later get them too
  const tagOwnLink = (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || !tags.length || a.hasAttribute('download') || a.dataset.buy) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || /^(mailto|tel|sms):/i.test(href)) return;
    try { if (new URL(href, location.href).origin !== location.origin) return; } catch { return; }
    a.setAttribute('href', withTags(href));
  };
  ['click', 'auxclick', 'contextmenu'].forEach((t) => document.addEventListener(t, tagOwnLink, true));

  // 2. counting. Taps made before Umami has loaded wait in line, then go out
  const waiting = [];
  window.arcCount = (name, data) => {
    if (window.umami && typeof window.umami.track === 'function') window.umami.track(name, data);
    else if (waiting.length < 20) waiting.push([name, data]);
  };
  let optedOut = false;
  try { optedOut = localStorage.getItem('umami.disabled') === '1'; } catch { /* storage blocked: the choice can't be read */ }
  const asksNot = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1';
  const counting = UMAMI_ID && location.hostname === SITE_HOST && !params.has('phase') && !optedOut && !asksNot;
  if (counting) {
    // the same settings twice: on the script tag, and as umamiConfig in case the browser doesn't report which script runs
    window.umamiConfig = { websiteId: UMAMI_ID, domains: SITE_HOST, doNotTrack: true };
    if (/thanks\.html$/.test(location.pathname)) window.umamiConfig.excludeSearch = true;
    // Umami gets the page path and its utm_* tags only: no checkout ids, email-tool ids (ck_subscriber_id, sh_kit) or
    // ad click ids (fbclid); a referrer from another site is cut to its address
    window.umamiConfig.beforeSend = (type, p) => {
      try {
        const u = new URL(p.url, location.href);
        u.search = String(new URLSearchParams([...u.searchParams].filter(([k]) => k.startsWith('utm_'))));
        p.url = u.href;
      } catch { p.url = location.origin + location.pathname; }
      if (p.referrer) {
        if (p.referrer.startsWith('/')) p.referrer = p.referrer.split('?')[0];
        else try { p.referrer = new URL(p.referrer).origin + '/'; } catch { p.referrer = ''; }
      }
      return p;
    };
    const s = document.createElement('script');
    s.defer = true;
    s.src = UMAMI_JS;
    s.dataset.websiteId = UMAMI_ID;
    s.dataset.domains = SITE_HOST;
    s.dataset.doNotTrack = 'true';
    if (/thanks\.html$/.test(location.pathname)) s.dataset.excludeSearch = 'true';   // the checkout id stays out
    s.onload = () => waiting.splice(0).forEach(([n, d]) => window.arcCount(n, d));
    document.head.append(s);
  }

  // the taps worth knowing about, wherever they are on the page
  const phase = () => document.documentElement.dataset.phase || '';
  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('a, button');
    if (!el) return;
    if (el.dataset.buy) { window.arcCount('buy', { product: el.dataset.buy, place: el.dataset.place || '', phase: phase() }); return; }
    if (el.hasAttribute('data-join')) { window.arcCount('join-open', { place: el.dataset.place || '', phase: phase() }); return; }
    const href = el.getAttribute('href') || '';
    if (el.hasAttribute('download')) { window.arcCount('playbook-pdf'); return; }
    if (/vote-loop\.html/.test(href)) { window.arcCount('playbook-open', { from: location.pathname.replace(/^\//, '') || 'index' }); return; }
    const out = href.match(/^https?:\/\/(?:www\.)?(youtube\.com|instagram\.com|discord\.gg|discord\.com|tally\.so)/);
    if (out) window.arcCount('outbound', { to: out[1] });
  }, true);
  // a question opened in the FAQ (the question only)
  document.addEventListener('toggle', (e) => {
    const d = e.target;
    if (d.tagName !== 'DETAILS' || !d.open || !d.closest('#faq')) return;
    const q = d.querySelector('summary');
    window.arcCount('faq', { q: q ? q.textContent.trim().slice(0, 80) : '' });
  }, true);

  // the privacy page's switch: turns counting off (or back on) for this browser. The choice is the only thing kept
  document.querySelectorAll('[data-count-switch]').forEach((btn) => {
    const note = document.querySelector('[data-count-state]');
    const show = () => {
      let off = false;
      try { off = localStorage.getItem('umami.disabled') === '1'; } catch { /* storage blocked */ }
      btn.textContent = off ? 'Turn counting back on' : 'Turn counting off for this browser';
      if (note) note.textContent = asksNot ? 'Your browser asks sites not to track it, so your visits are not counted.'
        : off ? 'Counting is off for this browser.' : 'Counting is on for this browser.';
    };
    btn.addEventListener('click', () => {
      try {
        if (localStorage.getItem('umami.disabled') === '1') localStorage.removeItem('umami.disabled');
        else localStorage.setItem('umami.disabled', '1');
      } catch { if (note) note.textContent = 'This browser blocks site storage, so the choice can\'t be saved.'; return; }
      show();
    });
    btn.hidden = false;
    show();
  });
})();
