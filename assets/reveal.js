(() => {
  const root = document.documentElement;
  if (root.classList.contains('rm')) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const els = Array.from(document.querySelectorAll('[data-reveal]'));
  if (!els.length) return;

  for (const el of els) {
    const delay = el.getAttribute('data-reveal-delay');
    if (delay) {
      const ms = Number.parseInt(delay, 10);
      if (Number.isFinite(ms) && ms > 0) el.style.transitionDelay = `${ms}ms`;
    }
  }

  if (!('IntersectionObserver' in window)) {
    for (const el of els) el.classList.add('reveal--in');
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('reveal--in');
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -10% 0px' }
  );

  for (const el of els) io.observe(el);
})();

