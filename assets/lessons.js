// lessons.html: the lessons list sign-up and the "Copy prompt" buttons.
// A sign-up goes the same two places as the home page's form (assets/site.js): the founder's Google Form, tagged
// place=lessons-page so lesson interest can be told apart on import, and Kit's welcome form, which emails the free
// playbook straight away. What's typed is sent only when the person presses the button.
(() => {
  const SIGNUP_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSewkPRQWSLJ-YFXJQhqC8vCXSqQUzKB2HUtBGYMsRI-ACy_Cw/formResponse';
  const ENTRY = { email: 'entry.1251555446', emails: 'entry.1006105774', source: 'entry.1430600887' };
  const KIT_WELCOME_FORM = '10142995';
  const count = (name, data) => { if (window.arcCount) window.arcCount(name, data); };

  const form = document.querySelector('.lessons-form');
  const done = document.querySelector('.ls-done');
  const showDone = () => {
    if (!form || !done) return;
    form.hidden = true;
    done.hidden = false;
  };
  let joinedBefore = false;
  try { joinedBefore = localStorage.getItem('arclab-lessons') === '1'; } catch { /* storage blocked: show the form */ }
  if (joinedBefore) showDone();

  if (form) {
    const email = form.querySelector('input[type=email]'), tick = form.querySelector('input[type=checkbox]');
    const err = form.querySelector('.su-err'), btn = form.querySelector('button');
    const tags = window.arcTags ? String(window.arcTags.linkTags()) : '';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { err.textContent = 'Type your email first.'; email.focus(); return; }
      if (!tick.checked) { err.textContent = 'Tick the box so we can email you when the lessons open.'; tick.focus(); return; }
      err.textContent = '';
      btn.disabled = true;
      const body = new URLSearchParams({ [ENTRY.email]: v, [ENTRY.emails]: 'Yes', [ENTRY.source]: [tags, 'place=lessons-page', 'from=lessons'].filter(Boolean).join('&') });
      fetch(SIGNUP_FORM, { method: 'POST', mode: 'no-cors', body }).then(() => {
        fetch(`https://app.kit.com/forms/${KIT_WELCOME_FORM}/subscriptions`, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ email_address: v }) }).catch(() => {});
        count('signup', { place: 'lessons-page' });
        try { localStorage.setItem('arclab-lessons', '1'); localStorage.setItem('arclab-joined', '1'); } catch { /* fine */ }
        showDone();
        if (done) done.focus();
      }, () => {
        btn.disabled = false;
        err.textContent = "That didn't send. Check your connection and try again.";
      });
    });
  }

  // "Copy prompt": copies the prompt above it; if the browser won't, it selects the text so it can be copied by hand
  document.querySelectorAll('.prompt').forEach((box) => {
    const b = box.querySelector('.copy'), code = box.querySelector('code');
    if (!b || !code) return;
    b.addEventListener('click', () => {
      const select = () => { const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
      const ok = () => { b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy prompt'; }, 1600); count('lesson-prompt-copy'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code.textContent).then(ok, select);
      else select();
    });
  });
})();
