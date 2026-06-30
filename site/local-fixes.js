/* Local static-mirror fix: replace the stuck Revolution Slider hero on the homepage
   with a clean fullscreen video hero that reproduces the original look & feel. */
(function () {
  function buildHero() {
    var wrap = document.querySelector('rs-module-wrap, .rev_slider_wrapper');
    if (!wrap || wrap.dataset.bgLocalDone) return;

    var hero = document.createElement('div');
    hero.className = 'bg-local-hero';
    hero.innerHTML =
      '<video class="bg-local-hero__video" autoplay muted loop playsinline preload="auto">' +
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

    var v = hero.querySelector('video');
    var tryPlay = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
    tryPlay();
    // some browsers need a tick after metadata loads
    v.addEventListener('loadeddata', tryPlay);
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
   About Us — scroll-animated engine (Lenis smooth scroll + GSAP ScrollTrigger)
   Progressive enhancement: if the libraries are missing or the visitor prefers
   reduced motion, the page degrades to a clean, fully-readable static layout.
   ============================================================ */
(function () {
  function boot() {
    var page = document.querySelector('.about-hero-section');
    if (!page) return; // only run on the About page

    // Scroll progress bar (always present)
    var progressEl = document.querySelector('.scroll-progress');
    if (!progressEl) {
      progressEl = document.createElement('div');
      progressEl.className = 'scroll-progress';
      document.body.appendChild(progressEl);
    }

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hasGsap = window.gsap && window.ScrollTrigger;

    // ---- count-up helper (shared by both paths) -------------------------
    function formatCount(val, suffix) {
      var out = String(val);
      if (suffix === '*') return out + '<sup>*</sup>';
      return out + (suffix || '');
    }
    function countUp(el, animate) {
      var target = parseFloat(el.getAttribute('data-count-to'));
      var suffix = el.getAttribute('data-suffix') || '';
      if (isNaN(target)) return;
      if (!animate || !hasGsap) { el.innerHTML = formatCount(target, suffix); return; }
      var obj = { v: 0 };
      window.gsap.to(obj, {
        v: target, duration: 1.6, ease: 'power2.out',
        onUpdate: function () { el.innerHTML = formatCount(Math.round(obj.v), suffix); }
      });
    }

    // ---- graceful fallback (no GSAP or reduced motion) ------------------
    if (!hasGsap || reduceMotion) {
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
      document.querySelectorAll('[data-count-to]').forEach(function (el) { countUp(el, false); });
      window.addEventListener('scroll', function () {
        var h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        progressEl.style.width = (h > 0 ? (window.pageYOffset / h) * 100 : 0) + '%';
      }, { passive: true });
      return;
    }

    var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    // ---- Lenis smooth scroll -------------------------------------------
    var lenis = null;
    if (window.Lenis) {
      lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    // ---- word splitter --------------------------------------------------
    function splitWords(root) {
      var inners = [];
      function processText(textNode, parent) {
        var parts = textNode.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        parts.forEach(function (w) {
          if (w === '' ) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
          var outer = document.createElement('span'); outer.className = 'about-word';
          var inner = document.createElement('span'); inner.className = 'about-word-i';
          inner.textContent = w; outer.appendChild(inner); frag.appendChild(outer);
          inners.push(inner);
        });
        parent.replaceChild(frag, textNode);
      }
      Array.prototype.slice.call(root.childNodes).forEach(function (node) {
        if (node.nodeType === 3) { processText(node, root); }
        else if (node.nodeType === 1) {
          Array.prototype.slice.call(node.childNodes).forEach(function (cn) {
            if (cn.nodeType === 3) processText(cn, node);
          });
        }
      });
      return inners;
    }

    // ---- HERO entrance --------------------------------------------------
    var heroHeadline = document.querySelector('.about-hero-headline[data-split-words]');
    var heroWords = heroHeadline ? splitWords(heroHeadline) : [];
    var heroEyebrow = document.querySelector('.about-hero-eyebrow span');
    var heroFoot = document.querySelector('.about-hero-foot');

    gsap.set(heroWords, { yPercent: 115 });
    if (heroEyebrow) gsap.set(heroEyebrow, { yPercent: 120, opacity: 0 });
    if (heroFoot) gsap.set(heroFoot, { y: 30, opacity: 0 });

    var heroTl = gsap.timeline({ delay: 0.25, defaults: { ease: 'expo.out' } });
    if (heroEyebrow) heroTl.to(heroEyebrow, { yPercent: 0, opacity: 1, duration: 1 });
    heroTl.to(heroWords, { yPercent: 0, duration: 1.2, stagger: 0.045 }, '-=0.7');
    if (heroFoot) heroTl.to(heroFoot, { y: 0, opacity: 1, duration: 1 }, '-=0.8');

    // hero stat count-up (fires with the entrance)
    heroTl.add(function () {
      document.querySelectorAll('.about-hero-stat-num[data-count-to]').forEach(function (el) { countUp(el, true); });
    }, '-=0.4');

    // ---- HERO parallax --------------------------------------------------
    document.querySelectorAll('#about-hero [data-parallax]').forEach(function (el) {
      var sp = parseFloat(el.getAttribute('data-parallax')) || 0.2;
      gsap.to(el, {
        yPercent: sp * 55, ease: 'none',
        scrollTrigger: { trigger: '#about-hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    });

    // ---- MANIFESTO line/word reveal ------------------------------------
    var lead = document.querySelector('.about-manifesto-lead[data-split-words]');
    if (lead) {
      var leadWords = splitWords(lead);
      gsap.set(leadWords, { yPercent: 110 });
      gsap.to(leadWords, {
        yPercent: 0, ease: 'expo.out', duration: 1.1, stagger: 0.03,
        scrollTrigger: { trigger: lead, start: 'top 82%' }
      });
    }
    document.querySelectorAll('.about-manifesto-p[data-split-words]').forEach(function (p) {
      var words = splitWords(p);
      gsap.set(words, { opacity: 0.16 });
      gsap.to(words, {
        opacity: 1, ease: 'none', stagger: 0.5,
        scrollTrigger: { trigger: p, start: 'top 80%', end: 'top 38%', scrub: true }
      });
    });

    // ---- MANIFESTO stat strip count-up ---------------------------------
    var statStrip = document.querySelector('.about-stat-strip');
    if (statStrip) {
      ScrollTrigger.create({
        trigger: statStrip, start: 'top 80%', once: true,
        onEnter: function () {
          statStrip.querySelectorAll('[data-count-to]').forEach(function (el) { countUp(el, true); });
        }
      });
    }

    // ---- TEAM horizontal pinned scroll ---------------------------------
    var hs = document.querySelector('[data-hscroll]');
    var track = hs ? hs.querySelector('[data-hscroll-track]') : null;
    var enableHorizontal = hs && track && window.innerWidth > 991;

    if (enableHorizontal) {
      hs.classList.add('is-horizontal');
      var fill = hs.querySelector('[data-hscroll-fill]');
      var currentEl = hs.querySelector('[data-hscroll-current]');
      var photos = Array.prototype.slice.call(hs.querySelectorAll('[data-card-parallax]'));
      var distance = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };

      gsap.to(track, {
        x: function () { return -distance(); },
        ease: 'none',
        scrollTrigger: {
          trigger: hs, start: 'top top',
          end: function () { return '+=' + distance(); },
          scrub: 1, pin: true, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: function (self) {
            if (fill) fill.style.width = (self.progress * 100) + '%';
            if (currentEl) {
              var idx = Math.min(3, Math.max(1, Math.ceil(self.progress * 3)));
              currentEl.textContent = '0' + idx;
            }
            // subtle photo parallax based on each card's screen position
            photos.forEach(function (img) {
              var r = img.parentNode.getBoundingClientRect();
              var center = (r.left + r.width / 2) / window.innerWidth; // 0..1
              var off = (center - 0.5) * 9; // percent
              img.style.transform = 'translate(' + (-5 - off) + '%, -5%)';
            });
          }
        }
      });
    }

    // ---- VALUES marquee (velocity-reactive) ----------------------------
    var marquee = document.querySelector('.about-marquee-track');
    if (marquee) {
      var mqX = 0, half = marquee.scrollWidth / 2;
      ScrollTrigger.addEventListener('refreshInit', function () { half = marquee.scrollWidth / 2; });
      gsap.ticker.add(function () {
        var v = lenis ? Math.abs(lenis.velocity || 0) : 0;
        mqX -= (0.6 + Math.min(v * 0.18, 14));
        if (mqX <= -half) mqX += half;
        marquee.style.transform = 'translateX(' + mqX + 'px)';
      });
    }

    // ---- CONTACT: magnetic button + pointer-follow glow -----------------
    document.querySelectorAll('[data-magnetic]').forEach(function (btn) {
      var label = btn.querySelector('.about-btn-label') || btn;
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var mx = e.clientX - r.left - r.width / 2;
        var my = e.clientY - r.top - r.height / 2;
        gsap.to(btn, { x: mx * 0.3, y: my * 0.45, duration: 0.5, ease: 'power3.out' });
        gsap.to(label, { x: mx * 0.14, y: my * 0.22, duration: 0.5, ease: 'power3.out' });
      });
      btn.addEventListener('mouseleave', function () {
        gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
        gsap.to(label, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
      });
    });
    document.querySelectorAll('[data-pointer-glow]').forEach(function (sec) {
      var glow = sec.querySelector('[data-glow-follow]');
      if (!glow) return;
      sec.addEventListener('mousemove', function (e) {
        var r = sec.getBoundingClientRect();
        gsap.to(glow, {
          x: (e.clientX - r.left - r.width / 2) * 0.4,
          y: (e.clientY - r.top - r.height / 2) * 0.25,
          duration: 1, ease: 'power2.out'
        });
      });
    });

    // ---- generic .reveal items -----------------------------------------
    ScrollTrigger.batch('.reveal', {
      start: 'top 88%',
      onEnter: function (els) { els.forEach(function (el) { el.classList.add('is-visible'); }); }
    });

    // ---- scroll progress bar -------------------------------------------
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) { progressEl.style.width = (self.progress * 100) + '%'; }
    });

    // recalc once everything (fonts/images) has settled
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    setTimeout(function () { ScrollTrigger.refresh(); }, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
