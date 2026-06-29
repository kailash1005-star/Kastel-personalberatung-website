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

/* --- About Us Page Interactivity & Smooth Scroll Effects --- */
(function() {
  function initAboutEffects() {
    // 1. Dynamic Scroll Progress Bar (only on about-us page)
    if (window.location.pathname.indexOf('about-us.html') !== -1 || document.querySelector('.about-hero-section')) {
      var progressEl = document.querySelector('.scroll-progress');
      if (!progressEl) {
        progressEl = document.createElement('div');
        progressEl.className = 'scroll-progress';
        document.body.appendChild(progressEl);
      }
      
      window.addEventListener('scroll', function() {
        var winScroll = document.documentElement.scrollTop || document.body.scrollTop;
        var height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        var scrolled = (winScroll / height) * 100;
        if (progressEl) {
          progressEl.style.width = scrolled + '%';
        }
      }, { passive: true });
    }

    // 2. Sticky Dossier Cards Overlap Scaling Effect
    var cards = document.querySelectorAll('.dossier-card');
    if (cards.length > 0) {
      function handleCardScaling() {
        cards.forEach(function(card, idx) {
          var nextCard = cards[idx + 1];
          if (nextCard) {
            var nextRect = nextCard.getBoundingClientRect();
            var overlapStart = window.innerHeight * 0.9;
            var overlapEnd = 170 + (idx * 25); // aligns with sticky top offset
            
            if (nextRect.top < overlapStart) {
              var progress = (overlapStart - nextRect.top) / (overlapStart - overlapEnd);
              progress = Math.min(Math.max(progress, 0), 1); // clamp to 0..1
              
              var scale = 1 - (progress * 0.05);
              var opacity = 1 - (progress * 0.4);
              var blur = progress * 2.5;
              
              card.style.transform = 'scale(' + scale + ')';
              card.style.opacity = opacity;
              card.style.filter = 'blur(' + blur + 'px)';
            } else {
              card.style.transform = 'scale(1)';
              card.style.opacity = '1';
              card.style.filter = 'none';
            }
          }
        });
      }
      
      window.addEventListener('scroll', handleCardScaling, { passive: true });
      handleCardScaling();
    }

    // 3. Scroll Reveal Animations (using IntersectionObserver)
    var reveals = document.querySelectorAll('.reveal');
    if (reveals.length > 0) {
      if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target); // trigger once
            }
          });
        }, {
          threshold: 0.1,
          rootMargin: '0px 0px -60px 0px'
        });
        
        reveals.forEach(function(el) {
          observer.observe(el);
        });
      } else {
        // Fallback for older browsers
        reveals.forEach(function(el) {
          el.classList.add('is-visible');
        });
      }
    }
  }

  // Bind to DOM load triggers
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAboutEffects);
  } else {
    initAboutEffects();
  }
  window.addEventListener('load', initAboutEffects);
})();
