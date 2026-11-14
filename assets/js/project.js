/* Project page: built from the entry in data.js that matches ?p=slug. */
(function () {
  'use strict';

  var host = document.querySelector('[data-project]');
  if (!host || !window.PROJECTS) return;

  var slug = new URLSearchParams(window.location.search).get('p');
  var index = window.PROJECTS.findIndex(function (p) { return p.slug === slug; });
  if (index < 0) { window.location.replace('projects.html'); return; }

  var project = window.PROJECTS[index];
  var next = window.PROJECTS[(index + 1) % window.PROJECTS.length];

  document.title = project.title + ' — ' + window.SITE.name;
  var desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', project.description);

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  /* intro: title on the left, description on the right */
  var intro = el('section', 'grid project__intro');
  var title = el('h1', 'project__title', project.title);
  title.setAttribute('data-reveal', 'text');
  var text = el('p', 'project__desc', project.description);
  text.setAttribute('data-reveal', 'text');
  intro.appendChild(title);
  intro.appendChild(text);
  host.appendChild(intro);

  /* rows of images, with the facts block wherever the data places it */
  project.rows.forEach(function (row) {
    if (row === 'meta') {
      var meta = el('section', 'grid project__meta');
      var heading = el('h2', null, 'About the piece');
      heading.setAttribute('data-reveal', 'text');
      var dl = el('dl', 'meta');
      project.meta.forEach(function (pair) {
        var item = el('div');
        item.setAttribute('data-reveal', 'text');
        item.appendChild(el('dt', null, pair[0]));
        item.appendChild(el('dd', null, pair[1]));
        dl.appendChild(item);
      });
      meta.appendChild(heading);
      meta.appendChild(dl);
      host.appendChild(meta);
      return;
    }

    var section = el('section', 'grid project__row');
    row.forEach(function (item) {
      var fig = el('figure', 'project__fig');
      fig.style.setProperty('--c', item.cols[0] + ' / span ' + item.cols[1]);

      var media = el('div', 'media');
      media.style.aspectRatio = item.img[1] + ' / ' + item.img[2];
      media.setAttribute('data-reveal', 'img');

      var img = el('img');
      img.src = window.Site.img(item.img[0]);
      img.alt = item.caption || project.title;
      img.width = item.img[1];
      img.height = item.img[2];
      img.loading = 'lazy';
      img.decoding = 'async';
      media.appendChild(img);
      fig.appendChild(media);

      if (item.caption) {
        var cap = el('figcaption', null, item.caption);
        cap.setAttribute('data-reveal', 'text');
        fig.appendChild(cap);
      }
      section.appendChild(fig);
    });
    host.appendChild(section);
  });

  /* onward */
  var nav = el('nav', 'grid project__next');
  nav.setAttribute('aria-label', 'Next project');
  nav.appendChild(el('span', 'dim', 'Next'));
  var link = el('a', null, next.title);
  link.href = 'project.html?p=' + encodeURIComponent(next.slug);
  nav.appendChild(link);
  host.appendChild(nav);
})();
