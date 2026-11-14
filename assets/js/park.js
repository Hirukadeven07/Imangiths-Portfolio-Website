/* Home map: the park the pieces stand in.

   Everything that is ground (lawns, contours, trees, garden rooms) is drawn very
   lightly, like the base layer of a site plan. The routes that link one project's
   pieces are the strong marks: a timber boardwalk, stepping stones, a sand path
   or a stream. The park is laid out around the pieces and routes it is given, so
   it rearranges itself when projects are added or moved in data.js. */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var TAU = Math.PI * 2;

  // `half` is half the drawn width in map units and must match style.css.
  var ROUTES = {
    stream:    { half: 18, layers: 3, wiggle: 1.25 },
    stones:    { half: 8, layers: 1, wiggle: 0.9 },
    sand:      { half: 14, layers: 2, wiggle: 0.8 },
    boardwalk: { half: 16, layers: 3, wiggle: 0.45 }
  };
  var ORDER = ['stream', 'stones', 'sand', 'boardwalk'];      // drawn bottom to top

  function el(name, attrs, parent) {
    var node = document.createElementNS(NS, name);
    for (var key in attrs) if (attrs[key] != null) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function pathOf(pts) {
    var d = '';
    for (var i = 0; i < pts.length; i++) d += (i ? ' L ' : 'M ') + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1);
    return d;
  }

  /* A route between two pieces: a straight run bent by a few slow waves. Streams
     meander most, the boardwalk least. */
  function route(a, b, type, rand) {
    var k = (ROUTES[type] || ROUTES.sand).wiggle;
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len, ny = dx / len;
    var steps = Math.max(12, Math.round(len / 20));
    var a1 = Math.min(120, len * 0.07) * (0.7 + rand() * 0.6) * k;
    var a2 = type === 'boardwalk' ? 0 : a1 * 0.36;
    var a3 = type === 'stream' ? a1 * 0.14 : 0;
    var f1 = len / 1100 * (0.8 + rand() * 0.5), f2 = len / 420 * (0.8 + rand() * 0.5), f3 = len / 170 * (0.8 + rand() * 0.5);
    var p1 = rand() * TAU, p2 = rand() * TAU, p3 = rand() * TAU;
    var pts = [];
    for (var i = 0; i <= steps; i++) {
      var t = i / steps, env = Math.pow(Math.sin(Math.PI * t), 0.75);
      var off = env * (a1 * Math.sin(TAU * f1 * t + p1) + a2 * Math.sin(TAU * f2 * t + p2) + a3 * Math.sin(TAU * f3 * t + p3));
      pts.push([a.x + dx * t + nx * off, a.y + dy * t + ny * off]);
    }
    return pts;
  }

  function build(o) {
    var W = o.width, H = o.height, rand = o.rand, nodes = o.nodes, links = o.links;

    var svg = el('svg', { 'class': 'park', width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' });
    var gLawnEdges = el('g', null, svg), gLawns = el('g', null, svg);
    var gRooms = el('g', null, svg), gTrees = el('g', null, svg), gNotes = el('g', null, svg);
    var gPads = el('g', null, svg);
    var gWater = el('g', null, svg), gPaths = el('g', null, svg);

    function rect(parent, cls, x, y, w, h, r) {
      return el('rect', { 'class': cls, x: x.toFixed(1), y: y.toFixed(1), width: w.toFixed(1), height: h.toFixed(1), rx: r || 0 }, parent);
    }
    function circle(parent, cls, x, y, r) {
      return el('circle', { 'class': cls, cx: x.toFixed(1), cy: y.toFixed(1), r: r.toFixed(1) }, parent);
    }
    function line(parent, cls, x1, y1, x2, y2) {
      return el('line', { 'class': cls, x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1) }, parent);
    }
    function tree(parent, x, y, r) {
      circle(parent, 'park__tree', x, y, r);
      circle(parent, 'park__trunk', x, y, Math.max(2.4, r * 0.07));
    }

    /* ---------- what is already taken: pieces, routes, garden rooms ---------- */

    var samples = [];
    links.forEach(function (l) {
      var half = ROUTES[l.type].half;
      for (var i = 0; i < l.pts.length; i += 2) samples.push([l.pts[i][0], l.pts[i][1], half]);
    });
    var rooms = [];

    function nodeGap(x, y) {
      var best = Infinity;
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        var d = Math.hypot(Math.max(Math.abs(x - n.x) - n.w / 2, 0), Math.max(Math.abs(y - n.y) - n.h / 2, 0));
        if (d < best) best = d;
      }
      return best;
    }
    function routeGap(x, y) {
      var best = Infinity;
      for (var i = 0; i < samples.length; i++) {
        var s = samples[i], d = Math.hypot(x - s[0], y - s[1]) - s[2];
        if (d < best) best = d;
      }
      return best;
    }
    function roomGap(x, y) {
      var best = Infinity;
      for (var i = 0; i < rooms.length; i++) {
        var d = Math.hypot(x - rooms[i].x, y - rooms[i].y) - rooms[i].r;
        if (d < best) best = d;
      }
      return best;
    }

    /* ---------- lawns: soft overlapping shapes that read as one meadow ---------- */

    function blob(cx, cy, R) {
      var p1 = rand() * TAU, p2 = rand() * TAU, p3 = rand() * TAU, pts = [];
      for (var i = 0; i < 40; i++) {
        var t = i / 40 * TAU;
        var r = R * (1 + 0.1 * Math.sin(2 * t + p1) + 0.07 * Math.sin(3 * t + p2) + 0.04 * Math.sin(5 * t + p3));
        pts.push([cx + Math.cos(t) * r * 1.2, cy + Math.sin(t) * r * 0.9]);
      }
      return pts;
    }
    // A smooth closed outline through the points, optionally shrunk towards (cx, cy).
    function closed(pts, cx, cy, k) {
      var q = pts.map(function (p) { return [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]; });
      var n = q.length, last = q[n - 1];
      var d = 'M ' + ((last[0] + q[0][0]) / 2).toFixed(1) + ' ' + ((last[1] + q[0][1]) / 2).toFixed(1);
      for (var i = 0; i < n; i++) {
        var a = q[i], b = q[(i + 1) % n];
        d += ' Q ' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' ' + ((a[0] + b[0]) / 2).toFixed(1) + ' ' + ((a[1] + b[1]) / 2).toFixed(1);
      }
      return d + ' Z';
    }

    for (var row = 0; row < 2; row++) {
      for (var col = 0; col < 4; col++) {
        var lx = W * (0.125 + 0.25 * col) + (rand() - 0.5) * W * 0.06;
        var ly = H * (0.27 + 0.47 * row) + (rand() - 0.5) * H * 0.12;
        var lr = Math.min(W / 4, H / 2) * (0.34 + rand() * 0.1);
        var outline = blob(lx, ly, lr);
        // Edges first, fills on top: where lawns overlap, the inner edges disappear.
        el('path', { 'class': 'park__lawn-edge', d: closed(outline, lx, ly, 1) }, gLawnEdges);
        el('path', { 'class': 'park__lawn', d: closed(outline, lx, ly, 1) }, gLawns);
        if ((row + col) % 2 === 0) {
          [0.7, 0.46, 0.24].forEach(function (k) {       // a low mound, as contour lines
            el('path', { 'class': 'park__contour', d: closed(outline, lx + lr * 0.12, ly - lr * 0.06, k) }, gLawns);
          });
        }
      }
    }

    /* ---------- garden rooms: formal pieces, set wherever there is open ground ---------- */

    function freeRadius(x, y) {
      return Math.min(x - 170, y - 170, W - 170 - x, H - 170 - y,
        nodeGap(x, y) - 80, routeGap(x, y) - 50, roomGap(x, y) - 110);
    }
    function claim(cap) {
      var best = null;
      for (var x = 300; x <= W - 300; x += 150) {
        for (var y = 300; y <= H - 300; y += 150) {
          var c = freeRadius(x, y);
          if (!best || c > best.r) best = { x: x, y: y, r: c };
        }
      }
      if (!best || best.r < 150) return null;
      best.r = Math.min(cap, best.r);
      rooms.push(best);
      return best;
    }
    function turned(room, degrees) {
      return el('g', { transform: 'rotate(' + degrees.toFixed(1) + ' ' + room.x + ' ' + room.y + ')' }, gRooms);
    }

    function pool(room) {
      var x = room.x, y = room.y, hw = room.r * 0.9, hh = room.r * 0.42;
      var g = turned(room, (rand() - 0.5) * 24);
      rect(g, 'park__hard', x - hw - 34, y - hh - 34, 2 * hw + 68, 2 * hh + 68, 6);
      rect(g, 'park__water', x - hw, y - hh, 2 * hw, 2 * hh, 10);
      rect(g, 'park__ripple', x - hw + 16, y - hh + 16, 2 * hw - 32, 2 * hh - 32, 6);
      for (var i = 0; i < 5; i++) {
        var rx = x - hw * 0.75 + rand() * hw * 1.2, ry = y - hh * 0.55 + rand() * hh * 1.1;
        line(g, 'park__ripple', rx, ry, rx + 40 + rand() * 70, ry);
      }
    }
    function rondel(room) {
      var x = room.x, y = room.y, r = room.r, turn = rand() * TAU;
      circle(gRooms, 'park__bed', x, y, r);
      circle(gRooms, 'park__line', x, y, r * 0.78);
      circle(gRooms, 'park__line', x, y, r * 0.56);
      circle(gRooms, 'park__hard', x, y, r * 0.3);
      for (var i = 0; i < 16; i++) {
        var a = turn + i / 16 * TAU, c = Math.cos(a), s = Math.sin(a);
        line(gRooms, 'park__line', x + c * r * 0.56, y + s * r * 0.56, x + c * r * 0.78, y + s * r * 0.78);
      }
    }
    function bosque(room) {
      var x = room.x, y = room.y, half = room.r * 0.68;
      var n = Math.max(3, Math.min(5, Math.round(half * 2 / 120))), gap = half * 2 / n;
      var g = turned(room, (rand() - 0.5) * 30);
      rect(g, 'park__hard', x - half, y - half, 2 * half, 2 * half, 4);
      for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) tree(g, x - half + gap * (i + 0.5), y - half + gap * (j + 0.5), gap * 0.34);
    }
    function parterre(room) {
      var x = room.x, y = room.y, half = room.r * 0.68, walk = half * 0.16, size = half - walk / 2 - 12;
      var g = turned(room, (rand() - 0.5) * 30);
      rect(g, 'park__hard', x - half, y - half, 2 * half, 2 * half, 4);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
        var bx = q[0] > 0 ? x + walk / 2 : x - half + 12, by = q[1] > 0 ? y + walk / 2 : y - half + 12;
        rect(g, 'park__bed', bx, by, size, size, 3);
        rect(g, 'park__line', bx + 18, by + 18, size - 36, size - 36, 2);
      });
      circle(g, 'park__hard', x, y, half * 0.2);
      circle(g, 'park__water', x, y, half * 0.1);
    }

    [[pool, 340], [rondel, 300], [bosque, 290], [parterre, 270], [rondel, 220]].forEach(function (job) {
      var room = claim(job[1]);
      if (room) job[0](room);
    });

    /* ---------- site-plan notes: boundary, north point, scale ---------- */

    rect(gNotes, 'park__bound', 90, 90, W - 180, H - 180, 40);

    [[W - 340, H - 330], [340, H - 330], [W - 340, 330], [340, 330]].some(function (spot) {
      var x = spot[0], y = spot[1];
      if (nodeGap(x, y) < 170 || routeGap(x, y) < 130 || roomGap(x, y) < 130) return false;
      circle(gNotes, 'park__line', x, y - 20, 46);
      el('path', { 'class': 'park__line', d: 'M ' + x + ' ' + (y - 84) + ' L ' + (x + 16) + ' ' + (y + 2) + ' L ' + x + ' ' + (y - 10) + ' L ' + (x - 16) + ' ' + (y + 2) + ' Z' }, gNotes);
      el('text', { 'class': 'park__note', x: x, y: y - 100 }, gNotes).textContent = 'N';
      line(gNotes, 'park__line', x - 110, y + 78, x + 110, y + 78);
      [-110, 0, 110].forEach(function (dx) { line(gNotes, 'park__line', x + dx, y + 70, x + dx, y + 86); });
      [['0', -110], ['25', 0], ['50 m', 110]].forEach(function (mark) {
        el('text', { 'class': 'park__note', x: x + mark[1], y: y + 122 }, gNotes).textContent = mark[0];
      });
      rooms.push({ x: x, y: y, r: 150 });
      return true;
    });

    /* ---------- trees: an avenue along the boardwalk, loose groves elsewhere ---------- */

    var trees = [];
    function plant(x, y, r) {
      if (x < 130 + r || y < 130 + r || x > W - 130 - r || y > H - 130 - r) return;
      if (nodeGap(x, y) < r + 46 || routeGap(x, y) < r + 16 || roomGap(x, y) < r + 30) return;
      for (var i = 0; i < trees.length; i++) {
        if (Math.hypot(x - trees[i][0], y - trees[i][1]) < (r + trees[i][2]) * 0.8) return;
      }
      trees.push([x, y, r]);
      tree(gTrees, x, y, r);
    }

    links.forEach(function (l) {
      if (l.type !== 'boardwalk') return;
      var out = ROUTES.boardwalk.half + 64, since = 85;
      for (var i = 1; i < l.pts.length - 1; i++) {
        since += Math.hypot(l.pts[i][0] - l.pts[i - 1][0], l.pts[i][1] - l.pts[i - 1][1]);
        if (since < 170) continue;
        since = 0;
        var tx = l.pts[i + 1][0] - l.pts[i - 1][0], ty = l.pts[i + 1][1] - l.pts[i - 1][1], tl = Math.hypot(tx, ty) || 1;
        plant(l.pts[i][0] - ty / tl * out, l.pts[i][1] + tx / tl * out, 30);
        plant(l.pts[i][0] + ty / tl * out, l.pts[i][1] - tx / tl * out, 30);
      }
    });

    for (var grove = 0; grove < 36; grove++) {
      var gx = 200 + rand() * (W - 400), gy = 200 + rand() * (H - 400);
      var spread = 160 + rand() * 230, count = 4 + Math.floor(rand() * 10);
      for (var t = 0; t < count; t++) {
        var ang = rand() * TAU, dist = spread * Math.sqrt(rand());
        plant(gx + Math.cos(ang) * dist, gy + Math.sin(ang) * dist, 34 + rand() * 44);
      }
    }

    /* ---------- a paved terrace under each piece ---------- */

    nodes.forEach(function (n) {
      rect(gPads, 'park__pad', n.x - n.w / 2 - 34, n.y - n.h / 2 - 34, n.w + 68, n.h + 68, 4);
    });

    /* ---------- the routes ---------- */

    var groups = {};
    ORDER.forEach(function (type) {
      var byProject = {};
      links.forEach(function (l) { if (l.type === type) (byProject[l.pi] = byProject[l.pi] || []).push(l); });
      Object.keys(byProject).forEach(function (pi) {
        var g = el('g', { 'class': 'park__route park__route--' + type }, type === 'stream' ? gWater : gPaths);
        var d = byProject[pi].map(function (l) { return pathOf(l.pts); }).join(' ');
        for (var layer = 1; layer <= ROUTES[type].layers; layer++) el('path', { 'class': 'r' + layer, d: d }, g);
        groups[pi] = g;
      });
    });

    /* Where a boardwalk or sand path meets a stream, it crosses on a small bridge. */
    function crossings(A, B) {
      var hits = [];
      for (var i = 0; i < A.length - 1; i++) {
        var a1 = A[i], rx = A[i + 1][0] - a1[0], ry = A[i + 1][1] - a1[1];
        for (var j = 0; j < B.length - 1; j++) {
          var b1 = B[j], sx = B[j + 1][0] - b1[0], sy = B[j + 1][1] - b1[1];
          var den = rx * sy - ry * sx;
          if (Math.abs(den) < 1e-6) continue;
          var qx = b1[0] - a1[0], qy = b1[1] - a1[1];
          var u = (qx * sy - qy * sx) / den, v = (qx * ry - qy * rx) / den;
          if (u < 0 || u > 1 || v < 0 || v > 1) continue;
          var rl = Math.hypot(rx, ry) || 1, sl = Math.hypot(sx, sy) || 1;
          hits.push({ x: a1[0] + rx * u, y: a1[1] + ry * u, tx: rx / rl, ty: ry / rl, sin: Math.abs(den) / (rl * sl) });
        }
      }
      return hits;
    }
    function box(pts) {
      var b = [Infinity, Infinity, -Infinity, -Infinity];
      pts.forEach(function (p) {
        if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1];
        if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1];
      });
      return b;
    }
    var streams = links.filter(function (l) { return l.type === 'stream'; });
    streams.forEach(function (s) { s.box = box(s.pts); });
    links.forEach(function (l) {
      if (l.type !== 'boardwalk' && l.type !== 'sand') return;
      var b = box(l.pts), half = ROUTES[l.type].half, placed = [];
      streams.forEach(function (s) {
        if (b[0] > s.box[2] || b[2] < s.box[0] || b[1] > s.box[3] || b[3] < s.box[1]) return;
        crossings(l.pts, s.pts).forEach(function (hit) {
          if (nodeGap(hit.x, hit.y) < 20) return;                      // hidden under a piece
          if (placed.some(function (p) { return Math.hypot(p.x - hit.x, p.y - hit.y) < 140; })) return;
          placed.push(hit);
          var reach = Math.min(110, (ROUTES.stream.half + 20) / Math.max(hit.sin, 0.35));
          var span = line(null, 'park__bridge', hit.x - hit.tx * reach, hit.y - hit.ty * reach, hit.x + hit.tx * reach, hit.y + hit.ty * reach);
          span.setAttribute('stroke-width', half * 2 + 10);
          groups[l.pi].insertBefore(span, groups[l.pi].firstChild);
        });
      });
    });

    return {
      svg: svg,
      // Bring one project's route forward (or none, with -1).
      focus: function (pi) {
        svg.classList.toggle('has-focus', pi >= 0);
        Object.keys(groups).forEach(function (key) { groups[key].classList.toggle('is-on', Number(key) === pi); });
      }
    };
  }

  window.Park = {
    types: ORDER.slice(),
    route: route,
    build: build
  };
})();
