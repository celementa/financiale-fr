// Comportement partagé des carrousels (flèches précédent / suivant sur une piste à défilement natif).
document.querySelectorAll<HTMLElement>('[data-carousel]').forEach((root) => {
  if (root.dataset.bound) return;
  root.dataset.bound = '1';
  const track = root.querySelector<HTMLElement>('[data-track]');
  if (!track) return;
  const gap = parseFloat(getComputedStyle(track).columnGap) || 16;
  const step = () => (track.querySelector('li')?.getBoundingClientRect().width ?? 300) + gap;
  root.querySelector('[data-prev]')?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  root.querySelector('[data-next]')?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
});
