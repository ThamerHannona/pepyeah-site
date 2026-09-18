(() => {
  const root = document.documentElement;
  if (!root.classList.contains('js')) return;

  const reduce =
    root.classList.contains('rm') ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const stack = document.querySelector('[data-hero-toasts]');
  if (!stack) return;

  const toasts = Array.from(stack.querySelectorAll('[data-toast]'));
  if (!toasts.length) return;

  const setStatic = () => {
    for (const t of toasts) {
      t.classList.remove('toast--in', 'toast--out');
      t.style.removeProperty('--d');
      t.style.opacity = '1';
      t.style.transform = 'none';
    }
  };

  if (reduce) {
    setStatic();
    return;
  }

  let started = false;
  let timeouts = [];

  const clearTimers = () => {
    for (const id of timeouts) window.clearTimeout(id);
    timeouts = [];
  };

  const resetHidden = () => {
    for (const t of toasts) {
      t.classList.remove('toast--in', 'toast--out');
      t.style.removeProperty('--d');
      t.style.opacity = '';
      t.style.transform = '';
    }
  };

  const cycle = () => {
    clearTimers();
    resetHidden();

    const visibleCount = Math.min(3, toasts.length);
    const inStagger = 220;
    const outStagger = 160;
    const settleMs = 5600;
    const gapMs = 900;

    for (let i = 0; i < visibleCount; i++) {
      const t = toasts[i];
      t.style.setProperty('--d', `${i * inStagger}ms`);
      t.classList.add('toast--in');
    }

    timeouts.push(
      window.setTimeout(() => {
        for (let i = 0; i < visibleCount; i++) {
          const t = toasts[i];
          t.classList.remove('toast--in');
          t.style.setProperty('--d', `${i * outStagger}ms`);
          t.classList.add('toast--out');
        }

        const outTotal = 420 + (visibleCount - 1) * outStagger;
        timeouts.push(
          window.setTimeout(() => {
            cycle();
          }, outTotal + gapMs)
        );
      }, settleMs)
    );
  };

  if (!('IntersectionObserver' in window)) {
    started = true;
    cycle();
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        if (started) return;
        started = true;
        cycle();
        io.disconnect();
      }
    },
    { threshold: 0.2, rootMargin: '0px 0px -20% 0px' }
  );

  io.observe(stack);
})();

