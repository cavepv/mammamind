document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-include]').forEach(el => {
    const name = el.dataset.include;
    const params = { ...el.dataset };
    delete params.include;

    fetch(`/assets/partials/${name}.html`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load partial: ${name}`);
        return res.text();
      })
      .then(html => {
        Object.entries(params).forEach(([key, val]) => {
          html = html.replaceAll(`{{${key.toUpperCase()}}}`, val);
        });
        el.outerHTML = html;
      })
      .catch(err => console.error(err));
  });

  // Sandwich menu toggle. Delegated on document since the header (and its
  // .menu-toggle button) is injected asynchronously via data-include above.
  const setMenuOpen = (toggle, isOpen) => {
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Stäng meny' : 'Öppna meny');
  };

  document.addEventListener('click', e => {
    const toggle = e.target.closest('.menu-toggle');
    if (!toggle) return;
    const nav = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!nav) return;
    setMenuOpen(toggle, nav.classList.toggle('is-open'));
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const openNav = document.querySelector('.site-nav.is-open');
    if (!openNav) return;
    openNav.classList.remove('is-open');
    const toggle = document.querySelector('.menu-toggle[aria-expanded="true"]');
    if (!toggle) return;
    setMenuOpen(toggle, false);
    toggle.focus();
  });
});
