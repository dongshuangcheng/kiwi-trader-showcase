// Presentation-only behavior: reveal transitions, motion control and demo deep links.
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const toggle = document.getElementById('motion-toggle');
let paused = prefersReduced.matches;
let observer;
function applyMotion() {
 document.body.classList.toggle('motion-paused', paused);
 toggle.setAttribute('aria-pressed', String(paused));
 toggle.disabled = prefersReduced.matches;
 toggle.textContent = prefersReduced.matches ? '已跟随系统减少动效' : paused ? '开启动效 ▷' : '暂停动效 Ⅱ';
}
applyMotion();
toggle.addEventListener('click', () => { paused = !paused; applyMotion(); });
prefersReduced.addEventListener('change', event => { paused = event.matches; applyMotion(); });
if ('IntersectionObserver' in window && !prefersReduced.matches) {
 observer = new IntersectionObserver(entries => {
  entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); } });
 }, { threshold: 0.08, rootMargin: '0px 0px 10px 0px' });
 document.querySelectorAll('.reveal').forEach(section => observer.observe(section));
 document.body.classList.add('motion-enabled');
}
document.querySelectorAll('[data-open-view]').forEach(link => link.addEventListener('click', () => {
 const key = link.dataset.openView;
 const view = document.querySelector(`[data-view="${key}"]`);
 if (view) view.click();
}));

const header = document.querySelector('.header');
function syncHeader() { header.classList.toggle('is-scrolled', window.scrollY > 32); }
window.addEventListener('scroll', syncHeader, { passive: true });
syncHeader();
