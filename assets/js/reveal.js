// Reveals elements with .reveal-on-scroll by adding .is-visible once they
// enter the viewport. Plays once per element (observer stops after trigger).
// The hidden pre-reveal CSS state only applies under the .js-reveal class,
// added here — if this script never runs (blocked, network failure) or
// IntersectionObserver is unsupported, content stays visible by default.
(function () {
  if (!('IntersectionObserver' in window)) return;

  var targets = document.querySelectorAll('.reveal-on-scroll');
  if (!targets.length) return;

  document.documentElement.classList.add('js-reveal');

  var observer = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  });

  targets.forEach(function (target) {
    observer.observe(target);
  });
})();
