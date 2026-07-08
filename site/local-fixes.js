/* ============================================================
   INTRO SPLASH — the overlay markup lives directly in index.html
   (#kp-intro) so it is visible from the first paint. This script
   only manages playback and dismissal. Shows on every page load.
   ============================================================ */
(function () {
  function initIntro() {
    var intro = document.getElementById('kp-intro');
    if (!intro) return;

    var v = document.getElementById('kp-intro-video');
    var tapBtn = document.getElementById('kp-intro-tap');
    var skipBtn = document.getElementById('kp-intro-skip');
    var dismissed = false;
    var playing = false;
    var endTimer = null;

    document.documentElement.classList.add('kp-intro-active');
    document.body.classList.add('kp-intro-active');

    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;

    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      // tell the hero to snap its background video to the final frame
      // BEFORE the overlay fades, so the handoff is seamless
      try { document.dispatchEvent(new CustomEvent('kp:intro-done')); } catch (e) {}
      intro.style.transition = 'opacity 1s ease';
      intro.style.opacity = '0';
      intro.style.pointerEvents = 'none';
      document.documentElement.classList.remove('kp-intro-active');
      document.body.classList.remove('kp-intro-active');
      setTimeout(function () {
        if (intro.parentNode) intro.parentNode.removeChild(intro);
      }, 1100);
    }

    function showTapPrompt() { intro.classList.add('needs-tap'); }
    function hideTapPrompt() { intro.classList.remove('needs-tap'); }

    v.addEventListener('ended', function () {
      try { v.pause(); } catch (e) {}
      setTimeout(dismiss, 400);
    });

    v.addEventListener('playing', function () {
      playing = true;
      hideTapPrompt();
      if (endTimer) return;
      var dur = isFinite(v.duration) && v.duration > 0 ? v.duration : 15;
      endTimer = setTimeout(dismiss, (dur + 2.5) * 1000);
    });

    v.addEventListener('error', function () {
      if (!playing) showTapPrompt();
    });

    setTimeout(dismiss, 45000);

    skipBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      dismiss();
    });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { dismiss(); document.removeEventListener('keydown', esc); }
    });

    tapBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      hideTapPrompt();
      v.muted = true;
      v.play().catch(showTapPrompt);
    });

    function tryPlay() {
      var p;
      try { p = v.play(); } catch (e) { showTapPrompt(); return; }
      if (p && typeof p.then === 'function') {
        p.then(hideTapPrompt).catch(showTapPrompt);
      }
    }
    tryPlay();
    v.addEventListener('loadeddata', function () { if (!playing) tryPlay(); });
    v.addEventListener('canplay', function () { if (!playing) tryPlay(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIntro);
  } else {
    initIntro();
  }
})();

/* Local static-mirror fix: replace the stuck Revolution Slider hero on the homepage
   with a clean fullscreen video hero that reproduces the original look & feel. */
(function () {
  function buildHero() {
    var wrap = document.querySelector('rs-module-wrap, .rev_slider_wrapper');
    if (!wrap || wrap.dataset.bgLocalDone) return;

    var hero = document.createElement('div');
    hero.className = 'bg-local-hero';
    // NOTE: no `loop` — the video plays once, then we reveal the text + buttons.
    hero.innerHTML =
      '<video class="bg-local-hero__video" autoplay muted playsinline preload="auto">' +
        '<source src="wp-content/uploads/2020/01/ff-bg3a-1.mp4" type="video/mp4">' +
      '</video>' +
      '<div class="bg-local-hero__overlay"></div>' +
      '<div class="bg-local-hero__content">' +
        '<p class="bg-local-hero__tagline">Wir finden das Top-Match f&uuml;r Ihr Team &ndash; in IT, Engineering und Financial Services.</p>' +
        '<h2 class="bg-local-hero__title">Ihr Partner f&uuml;r Personalsuche &amp; HR Advisory.</h2>' +
        '<p class="bg-local-hero__sub">Entdecken Sie, was Kastell Personalberatung f&uuml;r Sie tun kann.</p>' +
        '<div class="bg-local-hero__btns">' +
          '<a class="bg-local-hero__btn" href="candidates.html">Ich bin Kandidat:in</a>' +
          '<a class="bg-local-hero__btn" href="employers.html">Ich bin Arbeitgeber</a>' +
        '</div>' +
      '</div>';

    wrap.parentNode.replaceChild(hero, wrap);
    hero.dataset.bgLocalDone = '1';

    // The broken Revolution Slider leaves an `rs-fw-forcer` spacer sized to the
    // slider's runaway height (e.g. 99985px on employers.html). With the module
    // wrap gone that spacer just renders as a huge blank gap below the hero — so
    // strip it (and any leftover slider height forcers) out.
    document.querySelectorAll('rs-fw-forcer').forEach(function (f) {
      if (f.parentNode) f.parentNode.removeChild(f);
    });

    var v = hero.querySelector('video');

    // ---- reveal the text + buttons once the intro video has finished --------
    var content = hero.querySelector('.bg-local-hero__content');
    var revealed = false;
    var reveal = function () {
      if (revealed) return;
      revealed = true;
      hero.classList.add('is-revealed');   // fades content in + makes buttons clickable
    };

    // Seek the hero's background video to its very last frame and hold it there.
    var holdLastFrame = function () {
      var seek = function () {
        try {
          v.pause();
          if (isFinite(v.duration) && v.duration > 0) {
            v.currentTime = Math.max(0, v.duration - 0.05);
          }
        } catch (e) {}
      };
      if (v.readyState >= 1) { seek(); }
      else { v.addEventListener('loadedmetadata', seek, { once: true }); }
    };

    var introEl = document.getElementById('kp-intro');
    if (introEl) {
      // The fullscreen intro overlay plays the clip; the hero video never plays.
      // When the intro finishes (or is skipped), freeze the hero bg on the
      // clip's last frame so the landing background continues where it ended.
      v.removeAttribute('autoplay');
      v.autoplay = false;
      try { v.pause(); } catch (e) {}
      v.preload = 'auto';
      document.addEventListener('kp:intro-done', function () {
        holdLastFrame();
        reveal();
      }, { once: true });
      // safety: never leave content hidden even if the intro script dies
      setTimeout(function () { holdLastFrame(); reveal(); }, 50000);
      return;
    }

    // ---- no intro overlay on this page: legacy self-playing hero ------------
    // If the visitor prefers reduced motion, skip the intro and show content now.
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      v.removeAttribute('autoplay');
      reveal();
    }

    // Primary trigger: the video reached its end.
    v.addEventListener('ended', reveal);

    // Safety net #1: if autoplay is blocked or the file can't load, still reveal.
    v.addEventListener('error', reveal);

    // Safety net #2: hard cap — reveal a beat after the clip's natural length
    // (or 12s if the duration is unknown) so content never stays hidden.
    v.addEventListener('loadedmetadata', function () {
      var dur = isFinite(v.duration) && v.duration > 0 ? v.duration : 12;
      setTimeout(reveal, (dur + 0.6) * 1000);
    });
    setTimeout(reveal, 12000);

    // ---- kick off playback --------------------------------------------------
    var tryPlay = function () {
      if (revealed) return;
      var p = v.play();
      // if autoplay is rejected (no user gesture yet), reveal so the page is usable
      if (p && p.catch) p.catch(function () { reveal(); });
    };
    tryPlay();
    // some browsers need a tick after data loads
    v.addEventListener('loadeddata', tryPlay);
    // a first click also satisfies autoplay policies
    document.addEventListener('click', tryPlay, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildHero);
  } else {
    buildHero();
  }
  // safety: run again after full load in case revslider rebuilt its wrapper
  window.addEventListener('load', buildHero);
})();

/* ============================================================
   About Us — sticky team cards: IntersectionObserver reveal.
   Adds `is-visible` class when a card enters the viewport so the
   CSS transitions (fade + slide) fire.
   ============================================================ */
(function () {
  function boot() {
    var cards = document.querySelectorAll('[data-sticky-card]');
    if (!cards.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        } else {
          // Remove class when card scrolls out so re-entering re-animates
          entry.target.classList.remove('is-visible');
        }
      });
    }, { threshold: 0.3 });

    cards.forEach(function (card) { observer.observe(card); });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
/* ============================================================
   PROJEKTE (careers board) — renders into #kp-jobs-root on projekte.html.
   Reproduces the look of the previous Black & Grey careers board
   (dark hero + search + filters sidebar + job cards + detail modal),
   Kastell-branded and populated with the current openings below.
   To edit the vacancies, change the JOBS array.
   ============================================================ */
(function () {
  var CONTACT = 'kontakt@kastellpersonalberatung.com';

  // cat: SAP | IT | PMO   (drives filters + generated description blocks)
  var JOBS = [
    { t:'Manager Consulting SAP Payroll in M&uuml;nchen oder remote (m/w/d)', loc:'M&uuml;nchen / Remote', remote:true, cat:'SAP', mod:'SAP Payroll / HCM', exp:'5+ Jahre', date:'02.07.2026' },
    { t:'SAP Senior Consultant im Retail-Umfeld remote (m/w/d)', loc:'Remote', remote:true, cat:'SAP', mod:'SAP Retail', exp:'5+ Jahre', date:'30.06.2026' },
    { t:'Manager Consulting SAP Manufacturing (m/w/d)', loc:'Deutschland', remote:false, cat:'SAP', mod:'SAP Manufacturing (PP/DM)', exp:'5+ Jahre', date:'28.06.2026' },
    { t:'SAP-Basis Senior Administrator im Rhein-Neckar-Kreis (m/w/d)', loc:'Rhein-Neckar-Kreis', remote:false, cat:'SAP', mod:'SAP Basis', exp:'4-5 Jahre', date:'25.06.2026' },
    { t:'Senior Inhouse Consultant SAP-CO/PS (m/w/d) im Raum Koblenz', loc:'Raum Koblenz', remote:false, cat:'SAP', mod:'SAP CO / PS', exp:'5+ Jahre', date:'24.06.2026' },
    { t:'Senior Inhouse Consultant SAP-EWM/LES (m/w/d) im Raum Koblenz', loc:'Raum Koblenz', remote:false, cat:'SAP', mod:'SAP EWM / LES', exp:'5+ Jahre', date:'24.06.2026' },
    { t:'(Senior) Consultant SAP-SuccessFactors (Berlin und remote) (m/w/d)', loc:'Berlin / Remote', remote:true, cat:'SAP', mod:'SAP SuccessFactors', exp:'3-5 Jahre', date:'20.06.2026' },
    { t:'Inhouse Consultant SAP FI/CO im Kreis Tuttlingen (m/w/d)', loc:'Kreis Tuttlingen', remote:false, cat:'SAP', mod:'SAP FI / CO', exp:'3-5 Jahre', date:'18.06.2026' },
    { t:'Global Teamlead SAP im Kreis Tuttlingen (m/w/d)', loc:'Kreis Tuttlingen', remote:false, cat:'SAP', mod:'SAP (Teamleitung)', exp:'7+ Jahre', date:'18.06.2026' },
    { t:'Inhouse Consultant SAP SD/CS im Kreis Tuttlingen (m/w/d)', loc:'Kreis Tuttlingen', remote:false, cat:'SAP', mod:'SAP SD / CS', exp:'3-5 Jahre', date:'16.06.2026' },
    { t:'Lead Consultant SuccessFactors EC in Frankfurt/Freiburg/K&ouml;ln/Remote (m/w/d)', loc:'Frankfurt / Freiburg / K&ouml;ln / Remote', remote:true, cat:'SAP', mod:'SuccessFactors EC', exp:'5+ Jahre', date:'14.06.2026' },
    { t:'Inhouse Consultant SAP SuccessFactors in Linz oder remote (m/w/d)', loc:'Linz / Remote', remote:true, cat:'SAP', mod:'SAP SuccessFactors', exp:'3-5 Jahre', date:'12.06.2026' },
    { t:'Projekt Koordinator (m/w/d) im Projekt Management Office im Ortenau Kreis', loc:'Ortenau Kreis', remote:false, cat:'PMO', mod:'Projekt Management Office', exp:'3-5 Jahre', date:'11.06.2026' },
    { t:'Fullstack Web Developer in Dresden (m/w/d)', loc:'Dresden', remote:false, cat:'IT', mod:'Fullstack Web Development', exp:'3-5 Jahre', date:'10.06.2026' },
    { t:'Inhouse Consultant SAP-FS-CD in M&uuml;nchen (m/w/d)', loc:'M&uuml;nchen', remote:false, cat:'SAP', mod:'SAP FS-CD', exp:'3-5 Jahre', date:'08.06.2026' },
    { t:'SAP-Basis Senior Inhouse Consultant in M&uuml;nchen (m/w/d)', loc:'M&uuml;nchen', remote:false, cat:'SAP', mod:'SAP Basis', exp:'5+ Jahre', date:'05.06.2026' },
    { t:'SAP-HCM Specialist (m/w/d) im Landkreis Dillingen /Bayern', loc:'Landkreis Dillingen / Bayern', remote:false, cat:'SAP', mod:'SAP HCM', exp:'3-5 Jahre', date:'03.06.2026' }
  ];

  var CATLABEL = { SAP:'SAP', IT:'IT / Software', PMO:'Projektmanagement' };

  var TASKS = {
    SAP: ['Betreuung, Customizing und Weiterentwicklung der SAP-Systemlandschaft im Modul '+'{mod}'+'.',
          'Analyse und Optimierung der zugrunde liegenden Gesch&auml;ftsprozesse gemeinsam mit den Fachbereichen.',
          'Steuerung von (Teil-)Projekten, Roll-outs und Release-Wechseln.',
          'Second- und Third-Level-Support sowie Schulung der Key-User.'],
    IT:  ['Konzeption und Entwicklung moderner Webanwendungen im Frontend und Backend.',
          'Umsetzung neuer Features entlang des gesamten Entwicklungszyklus.',
          'Sicherstellung von Code-Qualit&auml;t, Performance und Wartbarkeit.',
          'Enge Zusammenarbeit mit Produkt und Design in einem agilen Team.'],
    PMO: ['Koordination und Steuerung von Projekten innerhalb des Project Management Office.',
          'Planung und &Uuml;berwachung von Terminen, Ressourcen und Budgets.',
          'Aufbereitung von Reports, Statusberichten und Entscheidungsvorlagen.',
          'Schnittstelle zwischen Projektleitung, Fachbereichen und Management.']
  };
  var PROFILE = {
    SAP: ['Mehrj&auml;hrige Erfahrung im SAP-Umfeld, idealerweise in '+'{mod}'+'.',
          'Fundiertes Prozessverst&auml;ndnis und Freude an der Arbeit mit Fachbereichen.',
          'Sehr gute Deutsch- und gute Englischkenntnisse.',
          'Strukturierte, eigenverantwortliche und l&ouml;sungsorientierte Arbeitsweise.'],
    IT:  ['Einschl&auml;gige Erfahrung in der Softwareentwicklung (Fullstack).',
          'Sicherer Umgang mit modernen Frameworks und sauberem, testbarem Code.',
          'Teamgeist, Neugier und eine l&ouml;sungsorientierte Denkweise.',
          'Sehr gute Deutschkenntnisse.'],
    PMO: ['Erfahrung im Projektmanagement oder in einem PMO.',
          'Sehr gute organisatorische F&auml;higkeiten und ein Blick f&uuml;rs Detail.',
          'Sicherer Umgang mit MS Office und g&auml;ngigen Projekttools.',
          'Ausgepr&auml;gte Kommunikations- und Koordinationsst&auml;rke.']
  };
  var BENEFITS = [
    'Attraktives Gehaltspaket und flexible Arbeitszeiten.',
    'M&ouml;glichkeit zum mobilen Arbeiten bzw. Remote-Anteil.',
    'Individuelle Weiterbildungs- und Entwicklungsm&ouml;glichkeiten.',
    'Ein wertsch&auml;tzendes, kollegiales Umfeld mit flachen Hierarchien.'
  ];

  function bullets(arr, mod) {
    return '<ul>' + arr.map(function (b) {
      return '<li>' + b.replace('{mod}', mod) + '</li>';
    }).join('') + '</ul>';
  }
  function shortText(j) {
    if (j.cat === 'SAP') return 'F&uuml;r unseren Mandanten suchen wir eine:n erfahrene:n Spezialist:in im Bereich ' + j.mod + ' &ndash; mit echtem Gestaltungsspielraum.';
    if (j.cat === 'IT')  return 'Werden Sie Teil eines Entwicklungsteams und bauen Sie moderne, nutzerzentrierte Webanwendungen mit.';
    return 'Koordinieren Sie spannende Projekte im PMO und behalten Sie Termine, Budgets und Stakeholder souver&auml;n im Blick.';
  }
  function longText(j) {
    return '<p>F&uuml;r unseren Mandanten &ndash; ein etabliertes Unternehmen &ndash; besetzen wir zum n&auml;chstm&ouml;glichen Zeitpunkt die Position <strong>' + j.t + '</strong>' +
             (j.loc ? ' am Standort ' + j.loc : '') + '. ' + shortText(j) + '</p>' +
           '<h4>Ihre Aufgaben</h4>' + bullets(TASKS[j.cat], j.mod) +
           '<h4>Ihr Profil</h4>' + bullets(PROFILE[j.cat], j.mod) +
           '<h4>Wir bieten</h4>' + bullets(BENEFITS, j.mod);
  }

  var pinIcon = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
  var clockIcon = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

  function boot() {
    var root = document.getElementById('kp-jobs-root');
    if (!root || root.dataset.done) return;
    root.dataset.done = '1';

    // ---- static shell (hero + board skeleton) --------------------------
    root.innerHTML =
      '<section class="kp-hero">' +
        '<div class="kp-hero__inner">' +
          '<p class="kp-hero__eyebrow">Karriere bei Kastell</p>' +
          '<h1 class="kp-hero__title">Schnell. Pr&auml;zise. Vertraulich. Menschlich.</h1>' +
          '<p class="kp-hero__sub">Entdecken Sie ausgew&auml;hlte Positionen in IT, SAP, Engineering und Financial Services &ndash; mit Tempo, Diskretion und ehrlichem Feedback, wenn der Fit stimmt.</p>' +
          '<a href="#kp-openings" class="kp-hero__btn">Stellenangebote ansehen</a>' +
        '</div>' +
      '</section>' +
      '<section class="kp-board" id="kp-openings">' +
        '<div class="kp-board__inner">' +
          '<header class="kp-board__head">' +
            '<h2>Stellenangebote</h2>' +
            '<p class="kp-board__sub">Aktuelle Positionen bei f&uuml;hrenden Unternehmen in Deutschland</p>' +
          '</header>' +
          '<div class="kp-search">' +
            '<div class="kp-search__field"><label>Was</label><input type="text" id="kp-what" placeholder="Jobtitel, Modul, Keyword"></div>' +
            '<div class="kp-search__field"><label>Wo</label><input type="text" id="kp-where" placeholder="Ort oder Region"></div>' +
            '<button type="button" class="kp-search__btn" id="kp-search-btn">Suchen</button>' +
          '</div>' +
          '<div class="kp-layout">' +
            '<aside class="kp-filters">' +
              '<h3>Filter</h3>' +
              '<div class="kp-filter-group"><h4>Anstellung</h4><label class="kp-check"><input type="checkbox" id="kp-remote"> Remote m&ouml;glich</label></div>' +
              '<div class="kp-filter-group"><h4>Bereich</h4><div id="kp-cats"></div></div>' +
              '<button type="button" class="kp-filters__reset" id="kp-reset">Filter zur&uuml;cksetzen</button>' +
            '</aside>' +
            '<div class="kp-main">' +
              '<p class="kp-count" id="kp-count"></p>' +
              '<div class="kp-list" id="kp-list"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>';

    // category checkboxes
    var cats = {};
    JOBS.forEach(function (j) { cats[j.cat] = (cats[j.cat] || 0) + 1; });
    document.getElementById('kp-cats').innerHTML = Object.keys(cats).map(function (c) {
      return '<label class="kp-check"><input type="checkbox" class="kp-cat" value="' + c + '"> ' + CATLABEL[c] + ' (' + cats[c] + ')</label>';
    }).join('');

    var listEl = document.getElementById('kp-list');
    var countEl = document.getElementById('kp-count');
    var whatEl = document.getElementById('kp-what');
    var whereEl = document.getElementById('kp-where');
    var remoteEl = document.getElementById('kp-remote');

    function txt(s) { var d = document.createElement('div'); d.innerHTML = s; return (d.textContent || '').toLowerCase(); }

    function current() {
      var what = txt(whatEl.value), where = txt(whereEl.value);
      var onlyRemote = remoteEl.checked;
      var checkedCats = Array.prototype.map.call(document.querySelectorAll('.kp-cat:checked'), function (c) { return c.value; });
      return JOBS.filter(function (j) {
        if (onlyRemote && !j.remote) return false;
        if (checkedCats.length && checkedCats.indexOf(j.cat) === -1) return false;
        if (what && (txt(j.t) + ' ' + txt(j.mod)).indexOf(what) === -1) return false;
        if (where && txt(j.loc).indexOf(where) === -1) return false;
        return true;
      });
    }

    function render() {
      var rows = current();
      countEl.innerHTML = rows.length + ' offene ' + (rows.length === 1 ? 'Position' : 'Positionen');
      if (!rows.length) {
        listEl.innerHTML = '<div class="kp-empty">Keine Positionen gefunden. Bitte passen Sie Ihre Suche an.</div>';
        return;
      }
      listEl.innerHTML = rows.map(function (j) {
        var idx = JOBS.indexOf(j);
        return '<article class="kp-card" data-i="' + idx + '" tabindex="0" role="button">' +
                 '<div class="kp-card__body">' +
                   '<h3 class="kp-card__title">' + j.t + '</h3>' +
                   '<div class="kp-card__meta">' +
                     '<span>' + pinIcon + ' ' + j.loc + '</span>' +
                     '<span class="kp-card__exp">' + j.exp + '</span>' +
                     (j.remote ? '<span class="kp-tag kp-tag--remote">Remote</span>' : '') +
                     '<span class="kp-tag">' + CATLABEL[j.cat] + '</span>' +
                   '</div>' +
                   '<p class="kp-card__snippet">' + shortText(j) + '</p>' +
                   '<div class="kp-card__foot"><span>Vollzeit</span><span class="kp-card__date">' + clockIcon + ' ' + j.date + '</span></div>' +
                 '</div>' +
                 '<span class="kp-card__cta">Details</span>' +
               '</article>';
      }).join('');
    }

    // ---- detail modal ---------------------------------------------------
    var modal = document.createElement('div');
    modal.className = 'kp-modal';
    modal.innerHTML =
      '<div class="kp-modal__backdrop" data-close></div>' +
      '<div class="kp-modal__panel" role="dialog" aria-modal="true">' +
        '<button class="kp-modal__close" data-close aria-label="Schlie&szlig;en">&times;</button>' +
        '<div class="kp-modal__scroll">' +
          '<p class="kp-modal__eyebrow">Stellenangebot</p>' +
          '<h2 class="kp-modal__title"></h2>' +
          '<div class="kp-modal__meta"></div>' +
          '<div class="kp-modal__body"></div>' +
          '<div class="kp-modal__apply"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    function openJob(j) {
      modal.querySelector('.kp-modal__title').innerHTML = j.t;
      modal.querySelector('.kp-modal__meta').innerHTML =
        '<span>' + pinIcon + ' ' + j.loc + '</span>' +
        '<span>' + clockIcon + ' Vollzeit</span>' +
        '<span class="kp-tag">' + CATLABEL[j.cat] + '</span>' +
        (j.remote ? '<span class="kp-tag kp-tag--remote">Remote</span>' : '') +
        '<span class="kp-modal__exp">' + j.exp + ' Erfahrung</span>';
      modal.querySelector('.kp-modal__body').innerHTML = longText(j);
      var subj = encodeURIComponent('Bewerbung: ' + (function (s) { var d = document.createElement('div'); d.innerHTML = s; return d.textContent; })(j.t));
      modal.querySelector('.kp-modal__apply').innerHTML =
        '<a class="kp-apply-btn" href="mailto:' + CONTACT + '?subject=' + subj + '">Jetzt bewerben</a>' +
        '<span class="kp-apply-note">Ref.-Kontakt: ' + CONTACT + '</span>';
      modal.querySelector('.kp-modal__scroll').scrollTop = 0;
      modal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
    function closeJob() { modal.classList.remove('is-open'); document.body.style.overflow = ''; }

    modal.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) closeJob(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeJob(); });

    listEl.addEventListener('click', function (e) {
      var card = e.target.closest('.kp-card'); if (card) openJob(JOBS[+card.dataset.i]);
    });
    listEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var card = e.target.closest('.kp-card'); if (card) { e.preventDefault(); openJob(JOBS[+card.dataset.i]); }
    });

    // ---- wire filters ---------------------------------------------------
    [whatEl, whereEl].forEach(function (el) { el.addEventListener('input', render); });
    document.getElementById('kp-search-btn').addEventListener('click', render);
    remoteEl.addEventListener('change', render);
    document.getElementById('kp-cats').addEventListener('change', render);
    document.getElementById('kp-reset').addEventListener('click', function () {
      whatEl.value = ''; whereEl.value = ''; remoteEl.checked = false;
      Array.prototype.forEach.call(document.querySelectorAll('.kp-cat'), function (c) { c.checked = false; });
      render();
    });

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.addEventListener('load', boot);
})();
