(() => {
  const toggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#site-nav');
  if (!toggle || !navigation) return;

  toggle.addEventListener('click', () => {
    const open = navigation.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  navigation.addEventListener('click', (event) => {
    if (!event.target.closest('a')) return;
    navigation.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  });
})();
