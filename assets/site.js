/* The APS Partners — site behaviour */
(function () {
  'use strict';

  /* Scroll reveal */
  var revealed = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealed.forEach(function (el) { io.observe(el); });
  } else {
    revealed.forEach(function (el) { el.classList.add('in'); });
  }

  /* Lead form — POST to the API when deployed with a backend (Vercel),
     graceful mailto fallback when hosted statically (GitHub Pages). */
  var form = document.getElementById('lead-form');
  if (!form) return;
  var status = document.getElementById('form-status');
  var submitBtn = document.getElementById('f-submit');
  var MAILTO = 'kanja.zakariae@gmail.com';

  function setStatus(msg, cls) {
    status.textContent = msg;
    status.className = 'form-status' + (cls ? ' ' + cls : '');
  }

  function mailtoFallback(data) {
    var subject = '[Case file] ' + (data.company || data.name);
    var body = 'Name: ' + data.name + '\nEmail: ' + data.email +
      '\nCompany: ' + (data.company || '-') + '\n\nSymptom:\n' + data.message;
    window.location.href = 'mailto:' + MAILTO +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
    setStatus('Direct intake unavailable here — your email client has been opened instead.', 'ok');
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      company: form.company.value.trim(),
      message: form.message.value.trim(),
      website: form.website.value.trim() /* honeypot */
    };
    if (!data.name || !data.email || !data.message) {
      setStatus('Name, email and the symptom are required.', 'err');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
      setStatus('That email address does not parse.', 'err');
      return;
    }

    submitBtn.disabled = true;
    setStatus('Filing…');

    fetch('api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (res) {
      if (!res.ok) throw new Error('http ' + res.status);
      return res.json();
    }).then(function () {
      form.reset();
      setStatus('Filed. You will hear back within one business day.', 'ok');
    }).catch(function () {
      mailtoFallback(data);
    }).finally(function () {
      submitBtn.disabled = false;
    });
  });
})();
