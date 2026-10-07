/* =========================================================
   Vermeille Pontoire — Portfolio
   Interactions: loader, scroll reveal, parallax, timeline,
   masonry filter, project modal, nav
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------- Loader ---------------- */
  const loader = document.getElementById('loader');
  const hideLoader = () => {
    setTimeout(() => loader.classList.add('is-hidden'), 900);
  };
  if (document.readyState === 'complete') hideLoader();
  else window.addEventListener('load', hideLoader);
  // safety fallback in case 'load' is delayed
  setTimeout(hideLoader, 3200);

  /* ---------------- Nav: scroll state + mobile menu ---------------- */
  const nav = document.getElementById('nav');
  const onScrollNav = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 30);
  };
  onScrollNav();
  window.addEventListener('scroll', onScrollNav, { passive: true });

  const burger = document.getElementById('navBurger');
  const navLinks = document.getElementById('navLinks');
  burger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(isOpen));
  });
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------------- Custom cursor dot (desktop) ---------------- */
  const cursorDot = document.getElementById('cursorDot');
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('mousemove', (e) => {
      cursorDot.style.left = e.clientX + 'px';
      cursorDot.style.top = e.clientY + 'px';
      cursorDot.classList.add('is-active');
    });
    document.querySelectorAll('a, button, .card').forEach(el => {
      el.addEventListener('mouseenter', () => cursorDot.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursorDot.classList.remove('is-hover'));
    });
  }

  /* ---------------- Scroll reveal (IntersectionObserver) ---------------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  const observeReveals = (root = document) => {
    root.querySelectorAll('.reveal, .timeline-item, .card').forEach(el => revealObserver.observe(el));
  };
  observeReveals();

  /* ---------------- Parallax blobs ---------------- */
  const parallaxEls = Array.from(document.querySelectorAll('[data-speed]'));
  let ticking = false;
  const updateParallax = () => {
    const y = window.scrollY;
    parallaxEls.forEach(el => {
      const speed = parseFloat(el.dataset.speed) || 0.1;
      el.style.transform = `translate3d(0, ${y * speed * -0.4}px, 0)`;
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });
  updateParallax();

  /* ---------------- Timeline ---------------- */
  const parcoursEl = document.getElementById('parcours');
  const timelineEl = document.getElementById('timeline');
  const tabs = document.querySelectorAll('.timeline-tab');

  const MONTHS = ['janvier','février','mars','avril','mai','juin',
                  'juillet','août','septembre','octobre','novembre','décembre'];

  // "Mai — Juin 2021" -> 202105 ; "2022 — 2024" -> 202206 (mi-année par défaut)
  const dateKey = (raw) => {
    const s = raw.toLowerCase();
    const year = (s.match(/\d{4}/) || [])[0];
    const monthIdx = MONTHS.findIndex(m => s.includes(m));
    return (year ? Number(year) : 0) * 100 + (monthIdx >= 0 ? monthIdx + 1 : 6);
  };

  const TRACK_LABEL = { formation: 'Formation', experience: 'Expérience' };

  const renderTimeline = () => {
    const entries = [
      ...(TIMELINE.formation || []).map(i => ({ ...i, track: 'formation' })),
      ...(TIMELINE.experience || []).map(i => ({ ...i, track: 'experience' }))
    ].sort((a, b) => dateKey(a.date) - dateKey(b.date));

    timelineEl.innerHTML = entries.map(item => `
      <div class="timeline-item timeline-item--${item.track}">
        <span class="timeline-item__dot"></span>
        <div class="timeline-item__inner">
          <p class="timeline-item__date">${item.date}</p>
          <div class="timeline-item__card">
            <span class="timeline-item__track">${TRACK_LABEL[item.track]}</span>
            <h3 class="timeline-item__title">${item.title}</h3>
            <p class="timeline-item__place">${item.place}</p>
          </div>
        </div>
      </div>
    `).join('');
    observeReveals(timelineEl);
  };

  const setTimelineFocus = (track) => {
    parcoursEl.classList.remove('is-focus-formation', 'is-focus-experience');
    parcoursEl.classList.add(`is-focus-${track}`);
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      setTimelineFocus(tab.dataset.track);
    });
  });

  renderTimeline();
  const activeTab = document.querySelector('.timeline-tab.is-active');
  setTimelineFocus(activeTab ? activeTab.dataset.track : 'formation');

  /* ---------------- Portfolio masonry ---------------- */
  const masonryEl = document.getElementById('masonry');
  const filterBtns = document.querySelectorAll('.filter-btn');

  const categoryTagColor = {
    visuelles: 'Identités visuelles',
    print: 'Print et Édition',
    illustrations: 'Illustrations',
    photographie: 'Photographie'
  };

  /* Trie les projets selon PROJECT_ORDER (js/projects-data.js).
     Tout projet absent de cette liste est conservé et placé à la fin,
     dans l'ordre du fichier — aucun projet ne peut disparaître. */
  const orderedProjects = () => {
    const order = typeof PROJECT_ORDER !== 'undefined' ? PROJECT_ORDER : [];
    const rank = new Map(order.map((id, i) => [id, i]));
    return PROJECTS.slice().sort((a, b) =>
      (rank.has(a.id) ? rank.get(a.id) : Infinity) -
      (rank.has(b.id) ? rank.get(b.id) : Infinity)
    );
  };

  let currentFilter = 'all';
  let currentCols = 0;

  /* Les cartes sont créées une seule fois puis simplement déplacées entre les
     colonnes : on conserve ainsi leurs écouteurs et l'état des animations. */
  const cardEls = orderedProjects().map(p => {
    const el = document.createElement('article');
    el.className = 'card';
    el.dataset.category = p.category;
    el.dataset.id = p.id;
    el.innerHTML = `
        <div class="card__media">
          <span class="card__tag">${p.categoryLabel}</span>
          <img src="${p.cover}" alt="${p.title}" loading="lazy">
          <div class="card__overlay">
            <span class="card__overlay-text">Voir le projet →</span>
          </div>
        </div>
        <div class="card__body">
          <h3 class="card__title">${p.title}</h3>
          <p class="card__subtitle">${p.subtitle}</p>
        </div>`;
    el.addEventListener('click', () => openModal(p.id));
    el.addEventListener('mouseenter', () => cursorDot && cursorDot.classList.add('is-hover'));
    el.addEventListener('mouseleave', () => cursorDot && cursorDot.classList.remove('is-hover'));
    return el;
  });

  // doit rester synchronisé avec les media queries de .masonry (css/style.css)
  const columnCount = () => {
    const w = window.innerWidth;
    if (w <= 620) return 1;
    if (w <= 980) return 2;
    return 3;
  };

  /* Répartition EN LIGNE : la carte 1 va en haut de la colonne 1, la 2 en haut
     de la colonne 2, la 3 en haut de la colonne 3, la 4 sous la 1re… L'ordre de
     PROJECT_ORDER se lit donc de gauche à droite, ligne par ligne. */
  const layoutMasonry = () => {
    const cols = columnCount();
    const visible = cardEls.filter(el =>
      currentFilter === 'all' || el.dataset.category === currentFilter);

    masonryEl.textContent = '';
    const colEls = Array.from({ length: cols }, () => {
      const col = document.createElement('div');
      col.className = 'masonry__col';
      masonryEl.appendChild(col);
      return col;
    });
    visible.forEach((el, i) => colEls[i % cols].appendChild(el));

    currentCols = cols;
    observeReveals(masonryEl);
  };

  layoutMasonry();

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      currentFilter = btn.dataset.filter;
      layoutMasonry();
    });
  });

  // on ne redessine que si le nombre de colonnes change réellement
  window.addEventListener('resize', () => {
    if (columnCount() !== currentCols) layoutMasonry();
  }, { passive: true });

  /* ---------------- Project modal ---------------- */
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  const modalClose = document.getElementById('modalClose');
  const modalBackdrop = document.getElementById('modalBackdrop');
  let lastFocused = null;

  /* ---------------- Carousel (galerie du projet) ---------------- */
  let carousel = null;

  const buildCarousel = (project) => {
    const slides = project.gallery;
    const single = slides.length <= 1;

    return `
      <div class="carousel${single ? ' carousel--single' : ''}" id="carousel">
        <div class="carousel__viewport">
          <div class="carousel__track" id="carouselTrack">
            ${slides.map((src, i) => `
              <div class="carousel__slide">
                <img src="${src}" alt="${project.title} — image ${i + 1}" loading="${i === 0 ? 'eager' : 'lazy'}">
              </div>
            `).join('')}
          </div>
          <button class="carousel__btn carousel__btn--prev" id="carouselPrev" aria-label="Image précédente">‹</button>
          <button class="carousel__btn carousel__btn--next" id="carouselNext" aria-label="Image suivante">›</button>
          <span class="carousel__counter" id="carouselCounter">1 / ${slides.length}</span>
        </div>
        <div class="carousel__dots" id="carouselDots">
          ${slides.map((_, i) => `
            <button class="carousel__dot${i === 0 ? ' is-active' : ''}" data-index="${i}" aria-label="Aller à l'image ${i + 1}"></button>
          `).join('')}
        </div>
      </div>
    `;
  };

  const initCarousel = (total) => {
    const track = document.getElementById('carouselTrack');
    if (!track) return null;

    const dots = Array.from(document.querySelectorAll('.carousel__dot'));
    const counter = document.getElementById('carouselCounter');
    let index = 0;

    const goTo = (i) => {
      index = (i + total) % total;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((d, n) => d.classList.toggle('is-active', n === index));
      if (counter) counter.textContent = `${index + 1} / ${total}`;
    };

    document.getElementById('carouselPrev').addEventListener('click', () => goTo(index - 1));
    document.getElementById('carouselNext').addEventListener('click', () => goTo(index + 1));
    dots.forEach(dot => dot.addEventListener('click', () => goTo(Number(dot.dataset.index))));

    // swipe tactile
    let startX = null;
    track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const delta = e.changedTouches[0].clientX - startX;
      if (Math.abs(delta) > 45) goTo(delta < 0 ? index + 1 : index - 1);
      startX = null;
    });

    return { prev: () => goTo(index - 1), next: () => goTo(index + 1) };
  };

  function openModal(id) {
    const project = PROJECTS.find(p => p.id === id);
    if (!project) return;

    modalBody.innerHTML = `
      ${buildCarousel(project)}
      <span class="modal__tag">${project.categoryLabel}</span>
      <h2 class="modal__title" id="modalTitle">${project.title}</h2>
      <p class="modal__subtitle">${project.subtitle}</p>
      <p class="modal__desc">${project.description}</p>
      <div class="modal__chips">
        ${project.tags.map(t => `<span class="modal__chip">${t}</span>`).join('')}
      </div>
    `;

    carousel = project.gallery.length > 1 ? initCarousel(project.gallery.length) : null;

    lastFocused = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modalClose.focus();
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    carousel = null;
    if (lastFocused) lastFocused.focus();
  }

  modalClose.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeModal();
    if (!carousel) return;
    if (e.key === 'ArrowLeft') carousel.prev();
    if (e.key === 'ArrowRight') carousel.next();
  });

});
