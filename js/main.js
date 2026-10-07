(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TEAL = '#14B8A0', LINE = '#1F3657', NAVY = '#0B1F3A';
  const TAU = Math.PI * 2;

  /* ---------- canvas helper ---------- */
  function fit(canvas, onResize) {
    const ctx = canvas.getContext('2d');
    const st = { ctx, w: 0, h: 0, dpr: 1, visible: true };
    const size = () => {
      const r = canvas.getBoundingClientRect();
      st.dpr = Math.min(devicePixelRatio || 1, 2);
      st.w = r.width; st.h = r.height;
      canvas.width = Math.max(1, r.width * st.dpr);
      canvas.height = Math.max(1, r.height * st.dpr);
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      onResize && onResize(st);
    };
    new ResizeObserver(size).observe(canvas);
    new IntersectionObserver(e => { st.visible = e[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
    size();
    return st;
  }
  const loop = (st, draw) => {
    let t0 = performance.now();
    const frame = now => {
      if (st.visible && !document.hidden) draw((now - t0) / 1000);
      if (!reduce) requestAnimationFrame(frame);
    };
    reduce ? draw(2.5) : requestAnimationFrame(frame);
  };
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

  /* ---------- HERO: circuito vivo ---------- */
  (() => {
    const cv = $('#hero-canvas'); if (!cv) return;
    const P = 36; // passo da grade
    let paths = [], pulses = [], mouse = { x: -999, y: -999 };
    const build = st => {
      const cols = Math.ceil(st.w / P), rows = Math.ceil(st.h / P);
      paths = [];
      const n = Math.round((cols * rows) / 55);
      for (let i = 0; i < n; i++) {
        // concentra mais traços no lado direito
        let x = Math.floor((0.35 + Math.random() * 0.65) * cols), y = Math.floor(Math.random() * rows);
        const pts = [[x * P, y * P]]; let dir = Math.random() < .5 ? 0 : 1;
        const segs = 4 + Math.floor(Math.random() * 6);
        for (let s = 0; s < segs; s++) {
          const len = 2 + Math.floor(Math.random() * 5), sg = Math.random() < .5 ? -1 : 1;
          if (dir === 0) x += len * sg; else y += len * sg;
          x = Math.max(0, Math.min(cols, x)); y = Math.max(0, Math.min(rows, y));
          pts.push([x * P, y * P]); dir ^= 1;
        }
        let L = 0; const cum = [0];
        for (let k = 1; k < pts.length; k++) { L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); cum.push(L); }
        if (L > 0) paths.push({ pts, cum, L });
      }
      pulses = paths.map((p, i) => ({ p, t: Math.random(), v: 70 + Math.random() * 90, on: i % 3 !== 0 }));
    };
    const st = fit(cv, build);
    addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    }, { passive: true });
    const at = (p, d) => {
      let k = 1; while (k < p.cum.length - 1 && p.cum[k] < d) k++;
      const a = p.pts[k - 1], b = p.pts[k], f = (d - p.cum[k - 1]) / ((p.cum[k] - p.cum[k - 1]) || 1);
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    };
    let last = 0;
    loop(st, t => {
      const { ctx, w, h } = st, dt = Math.min(t - last, .05); last = t;
      ctx.clearRect(0, 0, w, h);
      // pontos da grade reagem ao ponteiro
      for (let x = 0; x <= w; x += P) for (let y = 0; y <= h; y += P) {
        const d = Math.hypot(x - mouse.x, y - mouse.y), k = Math.max(0, 1 - d / 170);
        ctx.fillStyle = k > 0 ? `rgba(20,184,160,${.16 + k * .8})` : 'rgba(169,184,204,.16)';
        ctx.beginPath(); ctx.arc(x, y, 1.2 + k * 2.6, 0, TAU); ctx.fill();
      }
      // trilhas
      ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
      for (const p of paths) {
        ctx.strokeStyle = LINE; ctx.beginPath();
        p.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
        for (const e of [p.pts[0], p.pts[p.pts.length - 1]]) {
          ctx.fillStyle = NAVY; ctx.strokeStyle = '#2f5282'; ctx.beginPath(); ctx.arc(e[0], e[1], 4, 0, TAU); ctx.fill(); ctx.stroke();
        }
      }
      // pulsos
      for (const u of pulses) {
        if (!u.on) continue;
        u.t += dt * u.v / u.p.L; if (u.t > 1.15) { u.t = -.1; u.v = 70 + Math.random() * 90; }
        const tail = 70;
        for (let i = 0; i < 14; i++) {
          const d = (u.t * u.p.L) - i * (tail / 14); if (d < 0 || d > u.p.L) continue;
          const [x, y] = at(u.p, d);
          ctx.fillStyle = `rgba(20,184,160,${(1 - i / 14) * .95})`;
          ctx.beginPath(); ctx.arc(x, y, 3.2 - i * .14, 0, TAU); ctx.fill();
        }
      }
    });
  })();

  /* ---------- SERVIÇOS ---------- */
  const SVC = [
    { t: 'Engenharia de Software', x: 'Sistemas personalizados que se encaixam no seu processo, do primeiro protótipo à operação em escala.',
      l: ['Plataformas de comércio eletrônico, ERP e sistemas industriais sob medida', 'APIs e integração entre sistemas legados e novos', 'Modernização de aplicações e migração para AWS, Azure, GCP e OCI', 'Testes automatizados, CI/CD e revisão técnica contínua'] },
    { t: 'Dados & Analytics', x: 'Dados confiáveis, no lugar certo e na hora certa, para decisões que não dependem de planilhas paralelas.',
      l: ['Pipelines, data warehouse e lakehouse', 'Dashboards e BI para operação e diretoria', 'Governança, qualidade e catálogo de dados', 'Modelos analíticos e indicadores de negócio'] },
    { t: 'Soluções em IA', x: 'Inteligência artificial aplicada a processos reais, com escopo claro, métrica de sucesso e controle sobre os dados.',
      l: ['Assistentes e agentes sobre a base de conhecimento da empresa', 'Automação de documentos e fluxos repetitivos', 'Modelos preditivos: demanda, risco, fraude e churn', 'Avaliação, segurança e governança de modelos'] },
    { t: 'Serviços Gerenciados de TI', x: 'Sua operação de tecnologia monitorada, protegida e evoluindo, com responsáveis definidos e níveis de serviço em contrato.',
      l: ['Monitoramento e suporte a ambientes e aplicações', 'Operação multicloud (AWS, Azure, GCP e OCI), backup e continuidade', 'Segurança, patching e gestão de acessos', 'Relatórios periódicos e melhoria contínua'] },
    { t: 'Alocação de Talentos', x: 'Especialistas e squads integrados ao seu time, com a gestão técnica e a curadoria da Tempt.',
      l: ['Profissionais sêniores e plenos por perfil e stack', 'Squads dedicados com liderança técnica', 'Seleção, onboarding e acompanhamento de desempenho', 'Escala do time para cima ou para baixo conforme o projeto'] },
    { t: 'Cursos e Qualificação em TI', x: 'Formação prática para profissionais e equipes, conduzida por quem atua em projetos reais.',
      l: ['Trilhas em desenvolvimento, dados, IA, cloud e segurança', 'Turmas abertas e treinamentos in company', 'Projetos práticos e mentoria técnica', 'Planos de capacitação sob medida para sua equipe'] }
  ];
  let cur = 0;
  const tabs = $$('[role=tab]');
  const body = $('.svc-body');
  function select(i, focus) {
    cur = i;
    tabs.forEach((b, k) => { b.setAttribute('aria-selected', k === i); b.tabIndex = k === i ? 0 : -1; });
    $('#svc-title').textContent = SVC[i].t;
    $('#svc-text').textContent = SVC[i].x;
    $('#svc-list').innerHTML = SVC[i].l.map(s => `<li>${s}</li>`).join('');
    body.classList.remove('swap'); void body.offsetWidth; body.classList.add('swap');
    $('#p0').setAttribute('aria-labelledby', 't' + i);
    if (focus) tabs[i].focus();
    if (matchMedia('(max-width:1080px)').matches) tabs[i].scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    sceneT0 = performance.now();
  }
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => select(i));
    b.addEventListener('keydown', e => {
      const n = tabs.length;
      const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); select((cur + k + n) % n, true); }
      if (e.key === 'Home') { e.preventDefault(); select(0, true); }
      if (e.key === 'End') { e.preventDefault(); select(n - 1, true); }
    });
  });
  $$('[data-go]').forEach(a => a.addEventListener('click', () => select(+a.dataset.go)));
  let sceneT0 = performance.now();

  /* cenas do canvas, uma por serviço */
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const scenes = [
    // 0 — blocos que se montam
    (c, t, cx, cy, s) => {
      const cols = 6, rows = 5, g = 54 * s;
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        const i = r * cols + q, ph = Math.max(0, Math.min(1, (t * .9 - i * .05) % 4)), e = 1 - Math.pow(1 - Math.min(1, ph * 1.4), 3);
        const x = cx + (q - cols / 2) * g, y = cy + (r - rows / 2) * g - (1 - e) * 60 * s;
        c.globalAlpha = e; c.fillStyle = rnd(i) > .78 ? TEAL : (rnd(i + 9) > .5 ? '#24456F' : '#183457');
        rr(c, x, y, 42 * s, 42 * s, 9 * s); c.fill();
      }
      c.globalAlpha = 1;
    },
    // 1 — barras e linha de dados
    (c, t, cx, cy, s) => {
      const n = 12, g = 34 * s, base = cy + 150 * s; c.beginPath();
      const ys = [];
      for (let i = 0; i < n; i++) {
        const hgt = (70 + 90 * (.5 + .5 * Math.sin(t * 1.3 + i * .7)) + i * 8) * s, x = cx - n * g / 2 + i * g;
        c.fillStyle = i === n - 1 ? TEAL : '#24456F'; rr(c, x, base - hgt, 22 * s, hgt, 6 * s); c.fill();
        ys.push([x + 11 * s, base - hgt - 26 * s - 12 * Math.sin(t * 2 + i)]);
      }
      c.strokeStyle = TEAL; c.lineWidth = 2; c.beginPath(); ys.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
      ys.forEach(([x, y]) => { c.fillStyle = NAVY; c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fill(); c.stroke(); });
    },
    // 2 — rede neural
    (c, t, cx, cy, s) => {
      const L = [3, 5, 5, 2], gx = 120 * s, gy = 62 * s, nodes = [];
      L.forEach((n, l) => { for (let k = 0; k < n; k++) nodes.push({ l, k, x: cx + (l - 1.5) * gx, y: cy + (k - (n - 1) / 2) * gy }); });
      c.lineWidth = 1; c.strokeStyle = LINE;
      nodes.forEach(a => nodes.forEach(b => { if (b.l === a.l + 1) { c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); } }));
      for (let i = 0; i < 9; i++) {
        const p = (t * .55 + i * .37) % 1, l = Math.floor(p * 3), f = p * 3 - l;
        const A = nodes.filter(n => n.l === l), B = nodes.filter(n => n.l === l + 1);
        const a = A[Math.floor(rnd(i + l) * A.length)], b = B[Math.floor(rnd(i * 3 + l) * B.length)];
        c.fillStyle = TEAL; c.beginPath(); c.arc(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, 3.2, 0, TAU); c.fill();
      }
      nodes.forEach(n => { c.fillStyle = n.l === 3 ? TEAL : '#24456F'; c.strokeStyle = '#2f5282'; c.beginPath(); c.arc(n.x, n.y, 9 * s, 0, TAU); c.fill(); c.stroke(); });
    },
    // 3 — radar de monitoramento
    (c, t, cx, cy, s) => {
      c.strokeStyle = LINE; c.lineWidth = 1.5;
      for (let r = 1; r <= 4; r++) { c.beginPath(); c.arc(cx, cy, r * 52 * s, 0, TAU); c.stroke(); }
      c.beginPath(); c.moveTo(cx - 220 * s, cy); c.lineTo(cx + 220 * s, cy); c.moveTo(cx, cy - 220 * s); c.lineTo(cx, cy + 220 * s); c.stroke();
      const a = t * 1.2;
      const gr = c.createConicGradient ? c.createConicGradient(a - 1.1, cx, cy) : null;
      if (gr) { gr.addColorStop(0, 'rgba(20,184,160,0)'); gr.addColorStop(.17, 'rgba(20,184,160,.38)'); gr.addColorStop(.1751, 'rgba(20,184,160,0)'); c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, 208 * s, 0, TAU); c.fill(); }
      c.strokeStyle = TEAL; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * 208 * s, cy + Math.sin(a) * 208 * s); c.stroke();
      for (let i = 0; i < 7; i++) {
        const ang = rnd(i) * TAU, r = (50 + rnd(i + 5) * 150) * s, d = ((a - ang) % TAU + TAU) % TAU, al = Math.max(.25, 1 - d / 4);
        c.fillStyle = `rgba(${i === 2 ? '240,113,103' : '20,184,160'},${al})`; c.beginPath(); c.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 5, 0, TAU); c.fill();
      }
      c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, cy, 6, 0, TAU); c.fill();
    },
    // 4 — time em órbita
    (c, t, cx, cy, s) => {
      const n = 7, R = 150 * s;
      for (let i = 0; i < n; i++) {
        const a = t * .35 + i * TAU / n, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * .82;
        c.strokeStyle = LINE; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke();
        const f = (t * .6 + i * .3) % 1; c.fillStyle = TEAL; c.beginPath(); c.arc(cx + (x - cx) * f, cy + (y - cy) * f, 3, 0, TAU); c.fill();
        c.fillStyle = '#24456F'; c.strokeStyle = '#2f5282'; c.beginPath(); c.arc(x, y, 20 * s, 0, TAU); c.fill(); c.stroke();
        c.fillStyle = '#C9D5E4'; c.beginPath(); c.arc(x, y - 4 * s, 6 * s, 0, TAU); c.fill();
        c.beginPath(); c.arc(x, y + 13 * s, 10 * s, Math.PI, 0); c.fill();
      }
      c.fillStyle = TEAL; c.beginPath(); c.arc(cx, cy, 30 * s, 0, TAU); c.fill();
      c.fillStyle = NAVY; rr(c, cx - 14 * s, cy - 12 * s, 28 * s, 7 * s, 3.5 * s); c.fill(); rr(c, cx - 3.5 * s, cy - 12 * s, 7 * s, 24 * s, 3.5 * s); c.fill();
    },
    // 5 — escada de aprendizado
    (c, t, cx, cy, s) => {
      const n = 6, w = 62 * s, h = 36 * s, x0 = cx - n * w / 2, y0 = cy + 130 * s;
      for (let i = 0; i < n; i++) {
        const lit = ((t * .8) % (n + 1)) >= i;
        c.fillStyle = lit ? '#2b5489' : '#183457'; rr(c, x0 + i * w, y0 - i * h, w - 6 * s, h * (i + 1) + 6 * s, 8 * s); c.fill();
      }
      const p = (t * .8) % (n + 1), i = Math.min(n - 1, Math.floor(p)), f = p - i;
      const px = x0 + (i + f) * w + (w - 6 * s) / 2 - w / 2 * 0, py = y0 - Math.min(n - 1, i + f) * h - 18 * s - Math.abs(Math.sin(f * Math.PI)) * 24 * s;
      c.fillStyle = TEAL; c.beginPath(); c.arc(Math.min(px, x0 + n * w - w / 2), py, 11 * s, 0, TAU); c.fill();
      c.fillStyle = TEAL; c.globalAlpha = .9; c.beginPath(); c.arc(x0 + (n - 1) * w + w / 2 - 3 * s, y0 - (n - 1) * h - 44 * s - Math.sin(t * 3) * 3, 5 * s, 0, TAU); c.globalAlpha = 1; c.fill();
    }
  ];
  (() => {
    const cv = $('#svc-canvas'); if (!cv) return;
    const st = fit(cv);
    loop(st, () => {
      const t = (performance.now() - sceneT0) / 1000 + (reduce ? 2.5 : 0), { ctx, w, h } = st;
      ctx.clearRect(0, 0, w, h);
      const wide = w > 760, s = Math.min(w * (wide ? .6 : 1), h) / 560 * (wide ? 1 : .8);
      const cx = wide ? w * .7 : w / 2, cy = wide ? h * .5 : h * .3;
      ctx.save(); scenes[cur](ctx, t, cx, cy, s); ctx.restore();
    });
  })();
  (() => {
    const cv = $('#acad-canvas'); if (!cv) return;
    const st = fit(cv);
    loop(st, t => {
      const { ctx, w, h } = st; ctx.clearRect(0, 0, w, h);
      for (let x = 20; x < w; x += 28) for (let y = 20; y < h; y += 28) { ctx.fillStyle = 'rgba(169,184,204,.14)'; ctx.beginPath(); ctx.arc(x, y, 1.3, 0, TAU); ctx.fill(); }
      ctx.save(); scenes[5](ctx, t, w / 2, h * .42, Math.min(w, h) / 520); ctx.restore();
    });
  })();
  select(0);

  /* ---------- UI ---------- */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const burger = $('#burger'), nav = $('#nav');
  const closeNav = () => { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
  $$('#nav a').forEach(a => a.addEventListener('click', closeNav));
  addEventListener('keydown', e => e.key === 'Escape' && closeNav());

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); if (e.target.id === 'flow') e.target.classList.add('go'); io.unobserve(e.target); }
  }), { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach(el => io.observe(el));
  io.observe($('#flow'));

  $('#year').textContent = new Date().getFullYear();

  /* ---------- WhatsApp (OpenWA via servidor da Tempt) ---------- */
  let api = { form: false, whatsapp: null };
  fetch('/api/config').then(r => r.ok ? r.json() : Promise.reject()).then(cfg => {
    api = cfg;
    if (cfg.whatsapp) {
      const fab = $('#wa-fab');
      fab.href = `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent('Olá! Vim pelo site da Tempt Tecnologia e gostaria de falar com um especialista.')}`;
      fab.target = '_blank'; fab.rel = 'noopener';
      fab.setAttribute('aria-label', 'Falar com a Tempt pelo WhatsApp');
    }
  }).catch(() => {});

  /* ---------- formulário ---------- */
  const form = $('#form'), status = $('#form-status'), submit = $('button[type=submit]', form);
  const mailto = d => {
    const sub = encodeURIComponent(`Contato pelo site: ${d.interesse}`);
    const msg = encodeURIComponent(`Nome: ${d.nome}\nEmpresa: ${d.empresa || '-'}\nE-mail: ${d.email}\nInteresse: ${d.interesse}\n\n${d.msg}`);
    status.textContent = 'Abrindo seu aplicativo de e-mail para concluir o envio…';
    location.href = `mailto:contato@tempttecnologia.com.br?subject=${sub}&body=${msg}`;
  };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    let ok = true;
    $$('[required]', form).forEach(f => {
      const bad = f.type === 'checkbox' ? !f.checked : (!f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value)));
      f.classList.toggle('invalid', bad); f.setAttribute('aria-invalid', bad); if (bad) ok = false;
    });
    status.className = ok ? '' : 'err';
    if (!ok) { status.textContent = 'Revise os campos destacados.'; return; }
    const d = Object.fromEntries(new FormData(form));
    d.consent = true;
    if (!api.form) return mailto(d);
    submit.disabled = true; status.textContent = 'Enviando…';
    try {
      const r = await fetch('/api/contato', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
      if (r.status === 429) { status.className = 'err'; status.textContent = 'Muitos envios seguidos. Tente novamente em alguns minutos.'; }
      else if (!r.ok) mailto(d);
      else { status.textContent = 'Mensagem enviada! Um especialista da Tempt responderá em breve.'; form.reset(); }
    } catch { mailto(d); }
    submit.disabled = false;
  });
})();
