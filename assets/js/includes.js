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
});
