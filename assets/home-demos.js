(() => {
  const root = document.documentElement;
  if (!root.classList.contains('js')) return;

  const reduce =
    root.classList.contains('rm') ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));

  const startWhenVisible = (el, fn) => {
    if (!el) return;
    if (el.dataset.running === '1') return;

    if (reduce || !('IntersectionObserver' in window)) {
      el.dataset.running = '1';
      fn();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          el.dataset.running = '1';
          fn();
          io.disconnect();
          break;
        }
      },
      { threshold: 0.22, rootMargin: '0px 0px -18% 0px' }
    );

    io.observe(el);
  };

  // ---------------- Protocol search → log demo ----------------
  const proto = document.querySelector('[data-demo="protocol"]');
  if (proto) {
    const qEl = proto.querySelector('[data-proto-query]');
    const itemsEl = proto.querySelector('[data-proto-items]');
    const itemEls = Array.from(proto.querySelectorAll('[data-proto-item]'));
    const target = proto.querySelector('[data-proto-item="tirz"]');

    const setQuery = (s) => {
      if (qEl) qEl.textContent = s;
    };

    const clearItemState = () => {
      proto.classList.remove('proto--logged');
      for (const it of itemEls) it.classList.remove('sel', 'logged');
      if (target) {
        const act = target.querySelector('.act');
        if (act && act.dataset.defaultHtml) act.innerHTML = act.dataset.defaultHtml;
      }
    };

    const setListYForIndex = (idx) => {
      if (!itemsEl) return;
      const first = itemEls[0];
      if (!first) {
        itemsEl.style.setProperty('--list-y', '0px');
        return;
      }

      const row = first.getBoundingClientRect().height || 54;
      const s = window.getComputedStyle(itemsEl);
      const gap =
        Number.parseFloat(s.rowGap) ||
        Number.parseFloat(s.gap) ||
        Number.parseFloat(s.gridRowGap) ||
        8;
      const step = row + gap;
      const shiftRows = Math.max(0, idx - 2);
      const y = -shiftRows * step;
      itemsEl.style.setProperty('--list-y', `${y.toFixed(1)}px`);
    };

    const showLogged = () => {
      if (!target) return;
      target.classList.add('logged');
      proto.classList.add('proto--logged');

      const act = target.querySelector('.act');
      if (act) {
        if (!act.dataset.defaultHtml) act.dataset.defaultHtml = act.innerHTML;
        act.innerHTML =
          "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M20 6L9 17l-5-5'/></svg>logged";
      }
    };

    const setStaticEnd = () => {
      setQuery('tirz');
      if (target) {
        const idx = itemEls.indexOf(target);
        if (idx >= 0) setListYForIndex(idx);
        target.classList.add('sel');
      }
      showLogged();
    };

    startWhenVisible(proto, () => {
      if (reduce) {
        setStaticEnd();
        return;
      }

      (async () => {
        while (true) {
          clearItemState();
          setQuery('');
          if (itemsEl) itemsEl.style.setProperty('--list-y', '0px');
          await sleep(820);

          for (const s of ['t', 'ti', 'tir', 'tirz']) {
            setQuery(s);
            await sleep(170);
          }
          await sleep(240);

          if (target) {
            const idx = itemEls.indexOf(target);
            if (idx >= 0) setListYForIndex(idx);
          }
          await sleep(820);

          if (target) target.classList.add('sel');
          await sleep(520);

          showLogged();
          await sleep(2800);
        }
      })();
    });
  }

  // ---------------- Calculator demo ----------------
  const calc = document.querySelector('[data-demo="calc"]');
  if (calc) {
    const getOptions = (key) => {
      const wrap = calc.querySelector(`[data-wheel-items="${key}"]`);
      if (!wrap) return { wrap: null, options: [] };
      const options = Array.from(wrap.querySelectorAll('.wi')).map((el) => {
        const n = Number.parseFloat((el.textContent || '').trim());
        return Number.isFinite(n) ? n : null;
      });
      return { wrap, options };
    };

    const vial = getOptions('vial');
    const bac = getOptions('bac');
    const dose = getOptions('dose');

    const unitsEl = calc.querySelector('[data-calc-units]');
    const unitsMiniEl = calc.querySelector('[data-calc-units-mini]');
    const metaEl = calc.querySelector('[data-calc-meta]');
    const fillEl = calc.querySelector('[data-calc-fill]');

    const fmtUnits = (u) => {
      const rounded = Math.round(u * 2) / 2;
      return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    };

    const setWheelPos = (wheel, pos) => {
      if (!wheel.wrap) return;
      wheel.wrap.style.setProperty('--pos', String(pos));
    };

    const compute = ({ vialMg, bacMl, doseMcg }) => {
      const concMcgPerMl = (vialMg * 1000) / bacMl;
      const volMl = doseMcg / concMcgPerMl;
      const units = volMl * 100;
      return { units, volMl };
    };

    const setCalcState = ({ vialMg, bacMl, doseMcg }, { flash } = { flash: true }) => {
      const vialIdx = vial.options.indexOf(vialMg);
      const bacIdx = bac.options.indexOf(bacMl);
      const doseIdx = dose.options.indexOf(doseMcg);

      if (vialIdx >= 0) setWheelPos(vial, vialIdx);
      if (bacIdx >= 0) setWheelPos(bac, bacIdx);
      if (doseIdx >= 0) setWheelPos(dose, doseIdx);

      const { units, volMl } = compute({ vialMg, bacMl, doseMcg });
      const unitsStr = fmtUnits(units);

      if (unitsEl) unitsEl.textContent = unitsStr;
      if (unitsMiniEl) unitsMiniEl.textContent = unitsStr;
      if (metaEl) metaEl.textContent = `≈ ${volMl.toFixed(2)} mL @ 100u/mL`;

      if (fillEl) {
        const max = 50;
        const clamped = Math.max(0, Math.min(units, max));
        fillEl.style.height = `${((clamped / max) * 100).toFixed(1)}%`;
      }

      if (flash && !reduce) {
        calc.classList.remove('calc--flash');
        // Force reflow so the animation restarts reliably.
        void calc.offsetHeight;
        calc.classList.add('calc--flash');
        window.setTimeout(() => calc.classList.remove('calc--flash'), 740);
      }
    };

    const presets = [
      { vialMg: 10, bacMl: 2, doseMcg: 250 },
      { vialMg: 5, bacMl: 2, doseMcg: 150 },
      { vialMg: 15, bacMl: 3, doseMcg: 300 },
      { vialMg: 10, bacMl: 1, doseMcg: 200 },
    ];

    const setStaticEnd = () => setCalcState(presets[0], { flash: false });

    startWhenVisible(calc, () => {
      if (reduce) {
        setStaticEnd();
        return;
      }

      (async () => {
        let i = 0;
        setCalcState(presets[0], { flash: false });
        await sleep(900);

        while (true) {
          i = (i + 1) % presets.length;
          setCalcState(presets[i]);
          await sleep(2800);
        }
      })();
    });
  }
})();

