// Support page: Ko-fi (worldwide) and Razorpay (India). Both pages ask the supporter for the amount themselves.
// An empty link shows "opens soon" instead of a dead button.
const KOFI_URL = '';      // e.g. 'https://ko-fi.com/arclab' (set the Ko-fi coffee price to $5, so tips start at $5)
const RAZORPAY_URL = 'https://razorpay.me/@jashmehtaarclab';

(() => {
  const wire = (id, url, event) => {
    const go = document.getElementById(id);
    if (url) {
      go.href = url;
      go.target = '_blank';
      go.addEventListener('click', () => { if (window.umami) umami.track(event); });
    } else {
      // no account yet: leave the whole box out rather than show an unfinished one
      go.closest('.give-card').hidden = true;
    }
  };
  wire('kofi-go', KOFI_URL, 'support_kofi');
  wire('rzp-go', RAZORPAY_URL, 'support_razorpay');
})();
