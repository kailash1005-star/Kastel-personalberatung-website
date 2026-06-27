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
        '<p class="bg-local-hero__tagline">Connecting high potential young &amp; experienced game changers to great businesses in the Middle East.</p>' +
        '<h2 class="bg-local-hero__title">This is what we do best!</h2>' +
        '<p class="bg-local-hero__sub">Discover what Black &amp; Grey HR can do for you.</p>' +
        '<div class="bg-local-hero__btns">' +
          '<a class="bg-local-hero__btn" href="candidates.html">I\'m a Candidate</a>' +
          '<a class="bg-local-hero__btn" href="employers.html">I\'m an Employer</a>' +
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
