/**
 * Minimal progressive-enhancement script.
 * - Mobile nav toggle (aria-expanded aware, closes on link click / Escape,
 *   and returns focus to the toggle when dismissed with Escape)
 * - Reveal-on-scroll via IntersectionObserver with staggered delays
 */

document.documentElement.classList.add('js');

/* ---------- Mobile nav ---------- */
const nav = document.querySelector<HTMLElement>('[data-nav]');
const toggle = document.querySelector<HTMLButtonElement>('[data-nav-toggle]');
const mobilePanel = document.querySelector<HTMLElement>('[data-nav-mobile]');

function setNavOpen(open: boolean): void {
  if (!nav || !toggle || !mobilePanel) return;
  mobilePanel.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  nav.classList.toggle('is-open', open);
}

toggle?.addEventListener('click', () => {
  const current = toggle.getAttribute('aria-expanded') === 'true';
  setNavOpen(!current);
});

mobilePanel?.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  if (target && target.closest('a')) setNavOpen(false);
});

// Dismissing with Escape closes the panel the button owns, so focus has to go
// back to that button — otherwise the next Tab starts from the top of the
// document and a keyboard user is stranded (WCAG 2.4.3 focus order).
// Only Escape does this: closing via a link click or a viewport resize must
// not yank focus away from wherever the user actually is.
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!toggle || toggle.getAttribute('aria-expanded') !== 'true') return;
  setNavOpen(false);
  toggle.focus();
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 880) setNavOpen(false);
});

/* ---------- Reveal on scroll ---------- */
const revealEls = document.querySelectorAll<HTMLElement>('[data-reveal]');

if (revealEls.length > 0 && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          el.classList.add('is-visible');
          observer.unobserve(el);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -48px 0px' },
  );

  revealEls.forEach((el) => observer.observe(el));
} else {
  // No observer support: never hide content
  revealEls.forEach((el) => el.classList.add('is-visible'));
}