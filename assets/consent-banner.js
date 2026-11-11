/* Shorter cookie banner text (Joyce 11/11/2026).
   Termly writes a 75-word paragraph and has no setting to change it. This
   swaps in our own 40-word text once Termly's banner appears. The buttons,
   the consent choice and Termly's consent log are not touched.
   Keep the meaning in step with Termly's "Banner Text Settings" answers:
   targeted ads = Yes, social media sharing = Yes, personalization = No.
   If those answers change, update this text too. */
(function () {
  var TEXT =
    'We use essential cookies to run this site. With your OK, we also use ' +
    'cookies for analytics and ads, and share usage data with those partners. ' +
    'See our <a href="cookie-policy.html">Cookie Policy</a> and ' +
    '<a href="privacy.html">Privacy Notice</a>. ' +
    'Change your choice anytime under Preferences.';

  function swap() {
    var banners = document.querySelectorAll('[class*="termly-styles-termly-banner"]');
    for (var i = 0; i < banners.length; i++) {
      var msg = banners[i].querySelector('[class*="termly-styles-message"]');
      if (msg && msg.getAttribute('data-reblooma') !== '1') {
        msg.innerHTML = TEXT;
        msg.setAttribute('data-reblooma', '1');
      }
    }
  }

  // Termly loads on its own time (async), so watch for its banner.
  var obs = new MutationObserver(swap);
  function start() {
    swap();
    obs.observe(document.body, { childList: true, subtree: true });
    // Termly's banner only shows once; stop watching after a minute.
    setTimeout(function () { obs.disconnect(); }, 60000);
  }
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
