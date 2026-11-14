/* Shared behaviour: reveals and header state. */
(function () {
  'use strict';

  var html = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- small things ---------- */

  var year = new Date().getFullYear();
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = year; });

  function onScroll() { html.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- reveals ---------- */

  // Wrap each word so lines can slide up one after another.
  function split(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var texts = [], node;
    while ((node = walker.nextNode())) texts.push(node);

    texts.forEach(function (tn) {
      var frag = document.createDocumentFragment();
      tn.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span');
        var wi = document.createElement('span');
        w.className = 'w';
        wi.className = 'wi';
        wi.textContent = part;
        w.appendChild(wi);
        frag.appendChild(w);
      });
      tn.parentNode.replaceChild(frag, tn);
    });

    var top = null, line = -1;
    el.querySelectorAll('.w').forEach(function (w) {
      var t = w.offsetTop;
      if (top === null || Math.abs(t - top) > 2) { line++; top = t; }
      w.firstChild.style.setProperty('--i', line);
    });
    el.classList.add('is-split');
  }

  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 }) : null;

  function reveal() {
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      if (el.__revealed) return;
      el.__revealed = true;
      if (el.getAttribute('data-reveal') === 'text') split(el);
      if (reduce || !io) el.classList.add('is-in');
      else io.observe(el);
    });
  }

  window.Site = {
    reduce: reduce,
    img: function (name) { return window.SITE.imgPath + name + window.SITE.imgExt; }
  };

  // Page scripts build their markup synchronously; start revealing right after.
  setTimeout(reveal, 40);
})();
