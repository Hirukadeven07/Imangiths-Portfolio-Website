/* Contact: a short stepped note that opens in the visitor's own email app. */
(function () {
  'use strict';

  var form = document.querySelector('[data-form]');
  if (!form) return;

  var steps = Array.prototype.slice.call(form.querySelectorAll('.form__step'));
  var last = steps.length - 2;                 // the final panel is the thank-you
  var count = form.querySelector('[data-count]');
  var label = form.querySelector('[data-label]');
  var dotsBox = form.querySelector('.form__dots');
  var actions = form.querySelector('.form__actions');
  var back = form.querySelector('[data-back]');
  var next = form.querySelector('[data-next]');
  var current = 0;

  var dots = steps.slice(0, last + 1).map(function (_, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'form__dot';
    b.setAttribute('aria-label', 'Go to step ' + (i + 1));
    b.addEventListener('click', function () {
      if (i < current) { show(i); return; }
      for (var s = current; s < i; s++) { if (!valid(s)) { show(s); return; } }
      show(i);
    });
    dotsBox.appendChild(b);
    return b;
  });

  function valid(i) {
    var ok = true;
    steps[i].querySelectorAll('input, textarea').forEach(function (field) {
      var good = field.checkValidity();
      if (field.type !== 'radio') field.setAttribute('aria-invalid', good ? 'false' : 'true');
      if (!good && ok) { ok = false; if (i === current) field.focus(); }
    });
    return ok;
  }

  function show(i) {
    current = i;
    var done = i > last;
    steps.forEach(function (step, s) {
      step.hidden = s !== i;
      step.classList.toggle('is-active', s === i);
    });
    count.textContent = done ? '' : (i + 1) + '/' + (last + 1);
    label.textContent = steps[i].getAttribute('data-title');
    dots.forEach(function (d, s) {
      if (s === i) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
    });
    dotsBox.hidden = done;
    actions.hidden = done;
    back.hidden = i === 0;
    next.textContent = i === last ? 'Send' : 'Continue';
    if (!done) {
      var first = steps[i].querySelector('input:not([type="radio"]), textarea, input:checked');
      if (first && document.activeElement !== document.body) first.focus({ preventScroll: true });
    }
  }

  function value(name) {
    var field = form.elements[name];
    return field && field.value ? String(field.value).trim() : '';
  }

  function mailto() {
    var lines = [value('message'), '', '— ' + value('name'), value('email')];
    if (value('place')) lines.push(value('place'));
    return 'mailto:' + window.SITE.email +
      '?subject=' + encodeURIComponent(value('reason') + ' — via your portfolio') +
      '&body=' + encodeURIComponent(lines.join('\n'));
  }
  form.buildMailto = mailto;

  form.addEventListener('input', function (e) {
    if (e.target.getAttribute('aria-invalid') === 'true' && e.target.checkValidity()) {
      e.target.setAttribute('aria-invalid', 'false');
    }
  });

  back.addEventListener('click', function () { if (current > 0) show(current - 1); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!valid(current)) return;
    if (current < last) { show(current + 1); return; }
    form.querySelector('[data-thanks]').textContent = 'Thank you, ' + value('name').split(/\s+/)[0] + '.';
    window.location.href = mailto();
    show(last + 1);
  });

  // Enter moves on to the next step instead of doing nothing mid-form.
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); next.click(); }
  });

  show(0);
})();
