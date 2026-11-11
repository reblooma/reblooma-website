/* Reblooma — measurement layer.
 *
 * RULE: every tracker on reblooma.com loads from this file, and only here.
 * Never paste a tracking tag straight into a page: it would skip the consent
 * gate below and run before the visitor says yes.
 *
 * Paste your IDs below. Anything left blank simply doesn't load, so the site
 * works fine with none of them set. Nothing here sends names, emails or phone
 * numbers anywhere; only page views and the fact that a sign-up happened.
 *
 *   gtmId        Google Tag Manager   'GTM-XXXXXXX'   — the plumbing; add future tools here, not in code
 *   ga4Id        Google Analytics 4   'G-XXXXXXXXXX'  — visitors, pages, drop-off
 *   metaPixelId  Meta (Facebook/IG)   '1234567890'    — which ad produced a sign-up
 *   redditId     Reddit Ads           'a2_xxxxxxxx'   — same, for Reddit
 *   clarityId    Microsoft Clarity    'xxxxxxxxxx'    — free heatmaps and session replays
 *
 * CONSENT (11/11/2026): nothing below loads until the visitor says yes.
 *   Analytics tools (GTM, GA4, Clarity) wait for the 'analytics' choice.
 *   Ad tools (Meta, Reddit) wait for the 'advertising' choice, and never load
 *   when the browser sends Global Privacy Control.
 * The banner today is Termly, read only in readConsent() below. If the banner
 * is missing or fails to load, nothing loads: the site fails closed. To switch
 * banner vendors, change readConsent() and watchConsent() only.
 *
 * If you run GTM, you can leave ga4Id / metaPixelId / redditId blank and add
 * those tags inside GTM instead. Set them here only if you'd rather skip GTM.
 *
 * RULE (Joyce, 11/11/2026): never send health signals to ad platforms (Meta,
 * Reddit, Google Ads). That means no "patient" or "practitioner" role, no
 * "consultation", no condition, symptom or body-area words, in any event or
 * parameter. Ad platforms get page views and a plain sign-up only. The role
 * stays in GoHighLevel. To split results by audience, use separate campaigns
 * (pt_ for patients, pr_ for practitioners) and UTM tags. Washington's health
 * data law needs separate consent to share health data; a cookie banner is
 * not enough. Plan: https://claude.ai/artifact/19xcKLa2tUKyhRt9ywt84q
 */
window.REBLOOMA_ANALYTICS = Object.assign({
  gtmId: '',
  ga4Id: 'G-BMSJ102576',
  metaPixelId: '1701239134311164',
  redditId: '',
  clarityId: 'ys3dc2u8io'
}, window.REBLOOMA_ANALYTICS || {});

(function () {
  'use strict';
  var cfg = window.REBLOOMA_ANALYTICS;
  window.dataLayer = window.dataLayer || [];

  function script(src, attrs) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    Object.keys(attrs || {}).forEach(function (k) { s.setAttribute(k, attrs[k]); });
    document.head.appendChild(s);
    return s;
  }

  function loadAnalyticsPart1() {
    // ---- Google Tag Manager ----
    if (cfg.gtmId) {
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      script('https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(cfg.gtmId));
    }

    // ---- Google Analytics 4 (only when not handled inside GTM) ----
    if (cfg.ga4Id) {
      script('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.ga4Id));
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      gtag('js', new Date());
      gtag('config', cfg.ga4Id);
    }

  }

  function loadAds() {
    // ---- Meta pixel ----
    if (cfg.metaPixelId) {
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = true; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', cfg.metaPixelId);
      fbq('track', 'PageView');
    }

    // ---- Reddit pixel ----
    if (cfg.redditId) {
      !function (w, d) {
        if (!w.rdt) {
          var p = w.rdt = function () { p.sendEvent ? p.sendEvent.apply(p, arguments) : p.callQueue.push(arguments); };
          p.callQueue = [];
          var t = d.createElement('script'); t.src = 'https://www.redditstatic.com/ads/pixel.js'; t.async = true;
          var s = d.getElementsByTagName('script')[0]; s.parentNode.insertBefore(t, s);
        }
      }(window, document);
      rdt('init', cfg.redditId);
      rdt('track', 'PageVisit');
    }

  }

  function loadAnalyticsPart2() {
    // ---- Microsoft Clarity ----
    if (cfg.clarityId) {
      (function (c, l, a, r, i, t, y) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
        y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
      })(window, document, 'clarity', 'script', cfg.clarityId);
    }

  }

  function loadAnalytics() { loadAnalyticsPart1(); loadAnalyticsPart2(); }

  // ---- Consent gate ----
  // Returns { analytics: bool, advertising: bool }, or null when no choice is known.
  function readConsent() {
    var T = window.Termly;
    if (!T || typeof T.getConsentState !== 'function') return null;
    try {
      var c = T.getConsentState();
      if (!c) return null;
      return { analytics: !!c.analytics, advertising: !!c.advertising };
    } catch (e) { return null; }
  }

  // Calls apply() whenever the banner reports a new choice.
  function watchConsent(apply) {
    var tries = 0;
    (function hook() {
      var T = window.Termly;
      if (T && typeof T.on === 'function') {
        T.on('initialized', apply);
        T.on('consent', apply);
        apply();
        return;
      }
      if (++tries < 40) setTimeout(hook, 250);   // wait up to 10 seconds for the banner
    })();
  }

  var gpc = navigator.globalPrivacyControl === true;
  var loaded = { analytics: false, advertising: false };

  function apply() {
    var c = readConsent();
    if (!c) return;                                   // no choice yet: load nothing
    if (c.advertising && gpc) c.advertising = false;  // GPC always wins for ads
    // A category was on and is now off: reload so its tool stops running.
    if ((loaded.analytics && !c.analytics) || (loaded.advertising && !c.advertising)) {
      location.reload();
      return;
    }
    if (c.analytics && !loaded.analytics) { loaded.analytics = true; loadAnalytics(); }
    if (c.advertising && !loaded.advertising) { loaded.advertising = true; loadAds(); }
  }

  watchConsent(apply);

  // ---- Forward the site's own events to each platform ----
  // site.js pushes { event: 'waitlist_signup' | 'consultation_started', role, testing_practice }
  var seen = window.dataLayer.length;
  function forward(entry) {
    if (!entry || !entry.event) return;
    if (entry.event === 'waitlist_signup' || entry.event === 'consultation_started') {
      // Ad platforms get a plain sign-up: no role, no "consultation" (see RULE above).
      if (window.fbq) fbq('track', 'Lead');
      if (window.rdt) rdt('track', 'SignUp');
      if (window.gtag && cfg.ga4Id) gtag('event', entry.event, { role: entry.role || '' });
      if (window.clarity) clarity('set', 'signup', 'yes');
    }
  }
  // dataLayer is a plain array, so watch it rather than wrapping GTM's own push
  setInterval(function () {
    while (seen < window.dataLayer.length) forward(window.dataLayer[seen++]);
  }, 500);
})();
