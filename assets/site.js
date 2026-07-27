/* The APS Partners — site behaviour */
(function () {
  'use strict';

  var MAILTO = 'contact@theapspartners.com';
  /* Public proof links — filled in once the profile URLs are provided; the
     anchors stay hidden while empty so no dead link ever ships. */
  var CREDLY_URL = '';
  var LINKEDIN_URL = '';

  [['proof-credly', CREDLY_URL], ['proof-linkedin', LINKEDIN_URL]].forEach(function (p) {
    var el = document.getElementById(p[0]);
    if (el && p[1]) { el.href = p[1]; el.hidden = false; }
  });

  /* ── Scroll reveal ─────────────────────────────────── */
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

  /* ── Lead form with intent selector ────────────────── */
  var form = document.getElementById('lead-form');
  var status = document.getElementById('form-status');
  var submitBtn = document.getElementById('f-submit');
  var intent = 'case';

  function setStatus(el, msg, cls) {
    el.textContent = msg;
    el.className = el.id === 'b-status' ? 'form-status b-status' + (cls ? ' ' + cls : '')
                                        : 'form-status' + (cls ? ' ' + cls : '');
  }

  var intentRow = document.getElementById('intent-row');
  if (intentRow) {
    intentRow.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.intent');
      if (!btn) return;
      intentRow.querySelectorAll('.intent').forEach(function (b) { b.classList.remove('on'); });
      btn.classList.add('on');
      intent = btn.dataset.intent;
      document.getElementById('f-message-label').textContent = btn.dataset.label;
      document.getElementById('f-message').placeholder = btn.dataset.ph;
      submitBtn.textContent = intent === 'question' ? 'Send the question'
                            : intent === 'rdv' ? 'Request the call'
                            : 'Send the file';
    });
  }

  function intentSubject(data) {
    var tag = intent === 'question' ? '[Question]' : intent === 'rdv' ? '[Call request]' : '[Problem report]';
    return tag + ' ' + (data.company || data.name);
  }

  function mailtoFallback(data) {
    var body = 'Name: ' + data.name + '\nEmail: ' + data.email +
      '\nCompany: ' + (data.company || '-') + '\nIntent: ' + intent +
      '\n\nMessage:\n' + data.message;
    window.location.href = 'mailto:' + MAILTO +
      '?subject=' + encodeURIComponent(intentSubject(data)) +
      '&body=' + encodeURIComponent(body);
    setStatus(status, 'Direct intake unavailable here — your email client has been opened instead.', 'ok');
  }

  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var data = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        company: form.company.value.trim(),
        message: form.message.value.trim(),
        intent: intent,
        website: form.website.value.trim() /* honeypot */
      };
      if (!data.name || !data.email || !data.message) {
        setStatus(status, 'Name, email and the message are required.', 'err');
        return;
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
        setStatus(status, 'That email address does not parse.', 'err');
        return;
      }
      submitBtn.disabled = true;
      setStatus(status, 'Filing…');
      fetch('api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (!res.ok) throw new Error('http ' + res.status);
        return res.json();
      }).then(function () {
        form.reset();
        setStatus(status, 'Filed. You will hear back within one business day.', 'ok');
      }).catch(function () {
        mailtoFallback(data);
      }).finally(function () {
        submitBtn.disabled = false;
      });
    });
  }

  /* ── Booking — 30-min slot, Europe/Paris ───────────── */
  var bDate = document.getElementById('b-date');
  var bTime = document.getElementById('b-time');
  var bStatus = document.getElementById('b-status');
  if (!bDate) return;

  /* default: next business day, min today, max +45 days */
  var now = new Date();
  function fmtDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  var next = new Date(now.getTime() + 864e5);
  while (next.getDay() === 0 || next.getDay() === 6) next = new Date(next.getTime() + 864e5);
  bDate.min = fmtDate(now);
  bDate.max = fmtDate(new Date(now.getTime() + 45 * 864e5));
  bDate.value = fmtDate(next);

  /* Paris wall-clock → UTC Date (handles CET/CEST via Intl) */
  function parisToUTC(dateStr, timeStr) {
    var parts = dateStr.split('-').map(Number);
    var hm = timeStr.split(':').map(Number);
    var guess = Date.UTC(parts[0], parts[1] - 1, parts[2], hm[0], hm[1]);
    for (var i = 0; i < 3; i++) {
      var seen = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
      }).formatToParts(new Date(guess)).reduce(function (o, p) { o[p.type] = p.value; return o; }, {});
      var seenUTC = Date.UTC(+seen.year, +seen.month - 1, +seen.day, +(seen.hour === '24' ? 0 : seen.hour), +seen.minute);
      var want = Date.UTC(parts[0], parts[1] - 1, parts[2], hm[0], hm[1]);
      var diff = want - seenUTC;
      if (!diff) break;
      guess += diff;
    }
    return new Date(guess);
  }

  function stampUTC(d) {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  function slot() {
    if (!bDate.value) { setStatus(bStatus, 'Pick a date first.', 'err'); return null; }
    var day = new Date(bDate.value + 'T12:00:00').getDay();
    if (day === 0 || day === 6) { setStatus(bStatus, 'Please pick a business day — weekends are off the calendar.', 'err'); return null; }
    var start = parisToUTC(bDate.value, bTime.value);
    if (start.getTime() < Date.now()) { setStatus(bStatus, 'That slot is already in the past.', 'err'); return null; }
    return { start: start, end: new Date(start.getTime() + 30 * 60000) };
  }

  var TITLE = 'The APS Partners · Intro call';
  var DETAILS = '30-minute intro call with Zakariae Kanja (The APS Partners).\n' +
    'Bring the symptom — the workbook, the date that moved, the number nobody trusts.\n' +
    'Site: https://zkanja.github.io/theapspartners/';

  document.getElementById('b-google').addEventListener('click', function () {
    var s = slot(); if (!s) return;
    var url = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(TITLE) +
      '&dates=' + stampUTC(s.start) + '/' + stampUTC(s.end) +
      '&details=' + encodeURIComponent(DETAILS) +
      '&add=' + encodeURIComponent(MAILTO) +
      '&ctz=Europe/Paris';
    window.open(url, '_blank', 'noopener');
    setStatus(bStatus, 'Calendar opened — hit Save there and the invite lands in the founder\'s calendar.', 'ok');
  });

  document.getElementById('b-ics').addEventListener('click', function () {
    var s = slot(); if (!s) return;
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The APS Partners//Booking//EN',
      'BEGIN:VEVENT',
      'UID:' + stampUTC(s.start) + '@theapspartners',
      'DTSTAMP:' + stampUTC(new Date()),
      'DTSTART:' + stampUTC(s.start),
      'DTEND:' + stampUTC(s.end),
      'SUMMARY:' + TITLE,
      'DESCRIPTION:' + DETAILS.replace(/\n/g, '\\n'),
      'ATTENDEE;CN=The APS Partners:mailto:' + MAILTO,
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'aps-partners-call.ics';
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus(bStatus, 'Invite downloaded — open it in Outlook/Calendar and send; the founder is invited automatically.', 'ok');
  });

  document.getElementById('b-mail').addEventListener('click', function () {
    var s = slot(); if (!s) return;
    var pretty = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long',
      year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(s.start);
    window.location.href = 'mailto:' + MAILTO +
      '?subject=' + encodeURIComponent('[Call] ' + pretty + ' (Paris time)') +
      '&body=' + encodeURIComponent('Hello,\n\nI would like to book the 30-minute intro call on ' + pretty +
        ' (Europe/Paris).\n\nContext:\n\n— sent from theapspartners');
    setStatus(bStatus, 'Email drafted with the slot pre-filled.', 'ok');
  });
})();
