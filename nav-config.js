const NAV_SOURCES = [
  'nav/home.json',
  'nav/info.json'
];


document.addEventListener('DOMContentLoaded', () => {
  if (typeof loadNavButtons === 'function') {
    loadNavButtons(NAV_SOURCES);
  }
});