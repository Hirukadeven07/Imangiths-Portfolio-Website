/* Projects: an alternating list that loops forever in both directions. */
(function () {
  'use strict';

  var host = document.querySelector('[data-projects]');
  if (!host || !window.PROJECTS) return;

  var COPIES = 5, MIDDLE = 2;
  var loop = !window.Site.reduce;
  var copies = [];

  function buildList(isClone) {
    var list = document.createElement('div');
    list.className = 'grid plist';
    if (isClone) list.setAttribute('aria-hidden', 'true');

    window.PROJECTS.forEach(function (p, i) {
      var cover = p.cover, ratio = cover[1] / cover[2];

      var a = document.createElement('a');
      a.className = 'plist__item' + (ratio < 0.9 ? ' plist__item--tall' : '');
      a.href = 'project.html?p=' + encodeURIComponent(p.slug);
      a.style.gridRow = String(i + 1);
      a.style.setProperty('--ar', ratio.toFixed(4));
      if (isClone) a.tabIndex = -1;

      var article = document.createElement('article');

      var media = document.createElement('div');
      media.className = 'media';
      media.style.aspectRatio = cover[1] + ' / ' + cover[2];
      media.setAttribute('data-index', i);

      var img = document.createElement('img');
      img.src = window.Site.img(cover[0]);
      img.alt = isClone ? '' : p.title;
      img.width = cover[1];
      img.height = cover[2];
      img.decoding = 'async';
      media.appendChild(img);

      var title = document.createElement('p');
      title.className = 'plist__title';
      title.textContent = p.title;

      article.appendChild(media);
      article.appendChild(title);
      a.appendChild(article);
      list.appendChild(a);
    });
    return list;
  }

  for (var c = 0; c < (loop ? COPIES : 1); c++) {
    var list = buildList(loop && c !== MIDDLE);
    host.appendChild(list);
    copies.push(list);
  }

  /* Reveal a piece in every copy at once, so jumping between copies is invisible. */
  var medias = Array.prototype.slice.call(host.querySelectorAll('.media'));
  function revealIndex(index) {
    medias.forEach(function (m) { if (m.getAttribute('data-index') === index) m.classList.add('is-in'); });
  }
  if ('IntersectionObserver' in window && !window.Site.reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) revealIndex(en.target.getAttribute('data-index')); });
    }, { threshold: 0.05 });
    setTimeout(function () { medias.forEach(function (m) { io.observe(m); }); },
      document.documentElement.classList.contains('pt-covered') ? 480 : 40);
  } else {
    medias.forEach(function (m) { m.classList.add('is-in'); });
  }

  if (!loop) return;

  /* ---------- the loop: always come to rest inside the middle copy ---------- */

  document.documentElement.classList.add('is-loop');
  try { history.scrollRestoration = 'manual'; } catch (e) {}

  var H = 0, idle = 0, lead = 0;
  var header = document.querySelector('.header');

  // `lead` is how far above a copy's top the page rests, so that on small
  // screens the first piece clears the fixed header.
  function measure() {
    H = copies[0].offsetHeight;
    var top = parseFloat(getComputedStyle(copies[0]).paddingTop) || 0;
    lead = Math.max(0, (header ? header.offsetHeight : 0) + 8 - top);
  }

  function recentre() {
    if (!H) return;
    var y = window.scrollY, start = H * MIDDLE - lead;
    if (y < start || y >= start + H) {
      var into = ((y - start) % H + H) % H;
      window.scrollTo(0, start + into);
    }
  }

  function onScroll() {
    var y = window.scrollY;
    // Close to either end of the strip: jump straight away rather than hit the wall.
    if (y < H * 0.5 || y > H * (COPIES - 0.5) - window.innerHeight) { recentre(); return; }
    clearTimeout(idle);
    idle = setTimeout(recentre, 140);
  }

  measure();
  window.scrollTo(0, H * MIDDLE - lead);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    var into = H ? ((window.scrollY + lead - H * MIDDLE) % H + H) % H / H : 0;
    measure();
    window.scrollTo(0, H * MIDDLE - lead + into * H);
  });
  window.addEventListener('load', function () { measure(); recentre(); });
})();
