/* Home: a pannable, zoomable park of every piece, with one route per project. */
(function () {
  'use strict';

  var root = document.querySelector('[data-map]');
  if (!root || !window.PROJECTS || !window.Park) return;

  var W = window.MAP.width, H = window.MAP.height;
  var LEVELS = 6, START_LEVEL = 2, RANGE = 6;        // deepest zoom = 6 x the widest
  var START_FILL = 1.2;                              // opening view: the map is 1.2 x the screen
  var NODE_SCALE = window.MAP.nodeScale || 1;
  var STEP = Math.pow(RANGE, 1 / (LEVELS - 1));
  var reduce = window.Site.reduce;
  var canHover = window.matchMedia('(hover: hover)').matches;

  var world = root.querySelector('.map__world');
  var hint = root.querySelector('.map__hint');
  var hintLabel = hint.querySelector('span');

  world.style.width = W + 'px';
  world.style.height = H + 'px';

  /* ---------- deterministic randomness, so the map looks the same on every visit ---------- */

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var rand = rng(20261114);

  /* ---------- nodes ---------- */

  var nodes = [];
  window.PROJECTS.forEach(function (p, pi) {
    p.nodes.forEach(function (n) {
      nodes.push({
        project: p, pi: pi,
        src: n.img[0], x: n.x, y: n.y,
        w: n.size * NODE_SCALE, h: n.size * NODE_SCALE * n.img[2] / n.img[1]
      });
    });
  });

  /* ---------- routes: each project's pieces joined by the shortest tree of paths ---------- */

  var links = [];
  window.PROJECTS.forEach(function (p, pi) {
    var types = window.Park.types;
    var type = types.indexOf(p.route) >= 0 ? p.route : types[pi % types.length];
    var set = nodes.filter(function (n) { return n.pi === pi; });
    if (set.length < 2) return;
    var linked = [set[0]], rest = set.slice(1);
    while (rest.length) {
      var best = null;
      linked.forEach(function (a) {
        rest.forEach(function (b, bi) {
          var dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (!best || dist < best.dist) best = { a: a, b: b, bi: bi, dist: dist };
        });
      });
      links.push({ pi: pi, type: type, pts: window.Park.route(best.a, best.b, type, rand) });
      linked.push(best.b);
      rest.splice(best.bi, 1);
    }
  });

  var park = window.Park.build({ width: W, height: H, nodes: nodes, links: links, rand: rng(4071) });
  world.appendChild(park.svg);

  /* ---------- node elements ---------- */

  nodes.forEach(function (n) {
    var el = document.createElement('div');
    el.className = 'map__node';
    el.style.cssText = 'left:' + (n.x - n.w / 2).toFixed(1) + 'px;top:' + (n.y - n.h / 2).toFixed(1) + 'px;width:' +
      n.w.toFixed(1) + 'px;height:' + n.h.toFixed(1) + 'px';

    var a = document.createElement('a');
    a.className = 'map__link';
    a.href = 'project.html?p=' + encodeURIComponent(n.project.slug);
    a.draggable = false;
    a.setAttribute('aria-label', n.project.title);
    a.style.setProperty('--d', Math.round(Math.hypot(n.x - W / 2, n.y - H / 2) / 6) + 'ms');

    var img = document.createElement('img');
    img.className = 'map__img';
    img.src = window.Site.img(n.src);
    img.alt = '';
    img.draggable = false;
    img.decoding = 'async';

    a.appendChild(img);
    el.appendChild(a);
    world.appendChild(el);

    n.el = el;
    n.link = a;
    n.f1 = 0.00022 + rand() * 0.00018; n.f2 = 0.00020 + rand() * 0.00018;
    n.p1 = rand() * 6.2832; n.p2 = rand() * 6.2832;

    a.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') focusProject(n.pi, true); });
    a.addEventListener('pointerleave', function () { focusProject(-1); });
    a.addEventListener('focus', function () {
      focusProject(n.pi, false);
      if (a.matches(':focus-visible')) centerOn(n.x, n.y);
    });
    a.addEventListener('blur', function () { focusProject(-1); });
  });

  var active = -1;
  function focusProject(pi, withHint) {
    if (pi === active) return;
    active = pi;
    park.focus(pi);
    if (pi >= 0) hintLabel.textContent = window.PROJECTS[pi].title;
    hint.classList.toggle('is-on', pi >= 0 && !!withHint && canHover);
  }

  /* ---------- camera ---------- */

  var cur = { x: 0, y: 0, s: 1 }, target = { x: 0, y: 0, s: 1 };
  var vw = 0, vh = 0, sMin = 1, sMax = 1, rect = null, ready = false;

  function clamp() {
    target.s = Math.min(sMax, Math.max(sMin, target.s));
    target.x = clampAxis(target.x, W * target.s, vw);
    target.y = clampAxis(target.y, H * target.s, vh);
  }

  // Keep the map on screen: centred when it is smaller than the view, otherwise
  // let its edges come in by a small margin and no further.
  function clampAxis(pos, extent, view) {
    var pad = view * 0.08;
    if (extent + 2 * pad <= view) return (view - extent) / 2;
    return Math.min(pad, Math.max(view - extent - pad, pos));
  }

  function levelOf(s) { return Math.log(s / sMin) / Math.log(STEP); }

  function measure() {
    var level = ready ? levelOf(target.s) : START_LEVEL;
    var wx = ready ? (vw / 2 - target.x) / target.s : W / 2;
    var wy = ready ? (vh / 2 - target.y) / target.s : H / 2;
    rect = root.getBoundingClientRect();
    vw = rect.width; vh = rect.height;
    sMin = START_FILL * Math.max(vw / W, vh / H) / Math.pow(STEP, START_LEVEL);
    sMax = sMin * RANGE;
    target.s = sMin * Math.pow(STEP, level);
    target.x = vw / 2 - wx * target.s;
    target.y = vh / 2 - wy * target.s;
    clamp();
    if (!ready) { cur.x = target.x; cur.y = target.y; cur.s = target.s; ready = true; }
  }

  function zoomTo(s, fx, fy) {
    s = Math.min(sMax, Math.max(sMin, s));
    var k = s / target.s;
    target.x = fx - (fx - target.x) * k;
    target.y = fy - (fy - target.y) * k;
    target.s = s;
    clamp();
  }

  function setLevel(i) { zoomTo(sMin * Math.pow(STEP, Math.max(0, Math.min(LEVELS - 1, i))), vw / 2, vh / 2); }

  function centerOn(x, y) {
    target.x = vw / 2 - x * target.s;
    target.y = vh / 2 - y * target.s;
    clamp();
  }

  /* ---------- input: drag, pinch, wheel, keys ---------- */

  var pointers = new Map();
  var dragging = false, moved = 0, pinch = null;
  var vel = { x: 0, y: 0 }, lastMove = 0;

  root.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pinch = null;
    if (pointers.size === 1) {
      dragging = true; moved = 0; vel.x = vel.y = 0; lastMove = performance.now();
      root.setAttribute('data-status', 'dragging');
    }
  });

  window.addEventListener('pointermove', function (e) {
    if (canHover && rect) {
      hint.style.transform = 'translate3d(' + (e.clientX - rect.left + 14) + 'px,' + (e.clientY - rect.top + 18) + 'px,0)';
    }
    var p = pointers.get(e.pointerId);
    if (!p) return;
    var dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;

    if (pointers.size === 1) {
      var now = performance.now(), dt = Math.max(8, now - lastMove);
      lastMove = now;
      target.x += dx; target.y += dy;
      moved += Math.abs(dx) + Math.abs(dy);
      vel.x = vel.x * 0.75 + (dx / dt) * 0.25;
      vel.y = vel.y * 0.75 + (dy / dt) * 0.25;
      clamp();
    } else if (pointers.size === 2) {
      var pts = Array.from(pointers.values());
      var dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      var mid = { x: (pts[0].x + pts[1].x) / 2 - rect.left, y: (pts[0].y + pts[1].y) / 2 - rect.top };
      if (pinch) {
        target.x += mid.x - pinch.mid.x;
        target.y += mid.y - pinch.mid.y;
        zoomTo(target.s * dist / pinch.dist, mid.x, mid.y);
      }
      pinch = { dist: dist, mid: mid };
      moved += 10;
    }
  });

  function release(e) {
    if (!pointers.delete(e.pointerId)) return;
    pinch = null;
    if (pointers.size) return;
    dragging = false;
    root.setAttribute('data-status', 'idle');
    if (moved > 6 && performance.now() - lastMove < 80) {
      var speed = Math.hypot(vel.x, vel.y), cap = speed > 2.2 ? 2.2 / speed : 1;
      target.x += vel.x * cap * 180; target.y += vel.y * cap * 180;      // a little glide
      clamp();
    }
    setTimeout(function () { moved = 0; }, 60);
  }
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  // A drag that ends on a piece is not a click on it.
  root.addEventListener('click', function (e) {
    if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  root.addEventListener('dragstart', function (e) { e.preventDefault(); });

  root.addEventListener('wheel', function (e) {
    e.preventDefault();
    var unit = e.deltaMode === 1 ? 0.05 : (e.ctrlKey ? 0.01 : 0.0016);
    zoomTo(target.s * Math.exp(-e.deltaY * unit), e.clientX - rect.left, e.clientY - rect.top);
  }, { passive: false });

  root.addEventListener('keydown', function (e) {
    var step = 140;
    switch (e.key) {
      case 'ArrowLeft': target.x += step; break;
      case 'ArrowRight': target.x -= step; break;
      case 'ArrowUp': target.y += step; break;
      case 'ArrowDown': target.y -= step; break;
      case '+': case '=': setLevel(Math.floor(levelOf(target.s) + 1.001)); return;
      case '-': case '_': setLevel(Math.ceil(levelOf(target.s) - 1.001)); return;
      default: return;
    }
    e.preventDefault();
    clamp();
  });

  window.addEventListener('resize', measure);

  /* ---------- frame loop ---------- */

  var lastT = 0, lastS = 0;
  function frame(t) {
    var dt = Math.min(64, t - lastT || 16);
    lastT = t;
    var k = reduce ? 1 : 1 - Math.exp(-dt / (dragging ? 45 : 120));
    cur.x += (target.x - cur.x) * k;
    cur.y += (target.y - cur.y) * k;
    cur.s += (target.s - cur.s) * k;
    world.style.transform = 'translate3d(' + cur.x.toFixed(2) + 'px,' + cur.y.toFixed(2) + 'px,0) scale(' + cur.s.toFixed(5) + ')';
    // Keep the park's linework hairline at any zoom (updated in small steps while zooming).
    if (Math.abs(cur.s - lastS) > lastS * 0.02 || (lastS !== cur.s && Math.abs(cur.s - target.s) < 0.00002)) {
      lastS = cur.s;
      world.style.setProperty('--ls', (1 / cur.s).toFixed(3));
    }
    if (!reduce) {
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.el.style.transform = 'translate3d(' + (Math.sin(t * n.f1 + n.p1) * 14).toFixed(2) + 'px,' +
          (Math.cos(t * n.f2 + n.p2) * 14).toFixed(2) + 'px,0)';
      }
    }
    requestAnimationFrame(frame);
  }

  measure();
  requestAnimationFrame(frame);

  // Fade the map in once the first pieces have arrived (or after a short wait).
  var shown = false;
  function show() {
    if (shown) return;
    shown = true;
    if (root.getAttribute('data-status') === 'loading') root.setAttribute('data-status', 'idle');
  }
  var pending = nodes.length;
  nodes.forEach(function (n) {
    var img = n.link.firstChild;
    function done() { if (--pending <= 0) show(); }
    if (img.complete) done(); else { img.addEventListener('load', done); img.addEventListener('error', done); }
  });
  setTimeout(show, 1800);
})();
