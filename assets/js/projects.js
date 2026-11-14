/* Projects: a bento grid of every project, laid on an architect's cutting mat. */
(function () {
  'use strict';

  var host = document.querySelector('[data-projects]');
  if (!host || !window.PROJECTS) return;

  /* ---------- the grid ---------- */

  // Two columns, filled alternately, so tall and wide tiles interlock.
  var cols = [0, 1].map(function () {
    var col = document.createElement('div');
    col.className = 'bento__col';
    host.appendChild(col);
    return col;
  });

  window.PROJECTS.forEach(function (p, i) {
    var image = p.tile || p.cover;

    var a = document.createElement('a');
    a.className = 'bento__item';
    a.href = 'project.html?p=' + encodeURIComponent(p.slug);
    a.style.order = String(i);                     // keeps project order when the columns collapse

    var media = document.createElement('div');
    media.className = 'media';
    media.style.aspectRatio = image[1] + ' / ' + image[2];
    media.setAttribute('data-reveal', 'img');

    var img = document.createElement('img');
    img.src = window.Site.img(image[0]);
    img.alt = '';
    img.width = image[1];
    img.height = image[2];
    img.decoding = 'async';
    media.appendChild(img);

    var title = document.createElement('span');
    title.className = 'bento__title';
    title.textContent = p.title;

    a.appendChild(media);
    a.appendChild(title);
    cols[i % 2].appendChild(a);
  });

  /* ---------- the mat's markings: rulers along two edges, angle guides from a corner ---------- */

  var mat = document.querySelector('[data-mat]');
  if (!mat) return;

  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(NS, 'svg');
  mat.appendChild(svg);

  function add(name, attrs, text) {
    var node = document.createElementNS(NS, name);
    for (var key in attrs) node.setAttribute(key, attrs[key]);
    if (text != null) node.textContent = text;
    svg.appendChild(node);
    return node;
  }

  function draw() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var w = window.innerWidth, h = window.innerHeight;
    var m = 20, cell = 20, major = cell * 5;          // matches --m and --mat-cell in style.css
    var x, y, i;

    // Rulers: a number at every heavy line, counted in centimetres.
    for (x = m + major, i = 5; x < w - 30; x += major, i += 5) {
      add('text', { 'class': 'mat__mark', x: x + 3, y: h - 6 }, i);
    }
    for (y = h - m - major, i = 5; y > 70; y -= major, i += 5) {
      add('text', { 'class': 'mat__mark', x: 4, y: y - 3 }, i);
    }

    // Angle guides fanning out from the bottom-left corner, as on a cutting mat.
    var ox = m, oy = h - m, reach = Math.hypot(w, h);
    [15, 30, 45, 60, 75].forEach(function (deg) {
      var r = deg * Math.PI / 180;
      add('line', { 'class': 'mat__guide', x1: ox, y1: oy, x2: ox + Math.cos(r) * reach, y2: oy - Math.sin(r) * reach });
      add('text', { 'class': 'mat__mark', x: ox + Math.cos(r) * 150 + 4, y: oy - Math.sin(r) * 150 - 4 }, deg + '°');
    });
    [100, 200].forEach(function (radius) {
      add('path', { 'class': 'mat__guide', d: 'M ' + (ox + radius) + ' ' + oy + ' A ' + radius + ' ' + radius + ' 0 0 0 ' + ox + ' ' + (oy - radius) });
    });
  }

  draw();
  window.addEventListener('resize', draw);
})();
