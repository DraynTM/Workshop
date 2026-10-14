const NAV_SOURCES = [
  'nav/home.json',
  'nav/info.json'
];

const NAV_SOCIALS = [
  { label: 'YouTube',     url: 'https://www.youtube.com/@DraynDev',         icon: 'fa-brands fa-youtube' },
  { label: 'Itch.io',     url: 'https://the-drayn.itch.io/',                icon: 'fa-brands fa-itch-io' },
  { label: 'Twitter / X', url: 'https://x.com/thedrayndev',                 icon: 'fa-brands fa-x-twitter' },
  { label: 'Reddit',      url: 'https://www.reddit.com/user/DraynHGames',   icon: 'fa-brands fa-reddit-alien' },
  { label: 'Steam',       url: 'https://steamcommunity.com/id/drayndev',    icon: 'fa-brands fa-steam' },
  { label: 'Telegram',    url: 'https://t.me/drayns_campfire',              icon: 'fa-brands fa-telegram' },
  { label: 'Discord',     url: 'https://discord.gg/bPHuW7f7MJ',             icon: 'fa-brands fa-discord' }
];

function buildNavSocials() {
  const nav = document.querySelector('.top-nav');
  if (!nav || nav.querySelector('.nav-socials')) return;

  if (typeof loadFontAwesome === 'function') loadFontAwesome();

  const wrap = document.createElement('div');
  wrap.className = 'nav-socials';

  NAV_SOCIALS.forEach(s => {
    const a = document.createElement('a');
    a.className = 'nav-social';
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', s.label);
    a.title = s.label;
    a.innerHTML = `<i class="${s.icon}"></i>`;
    wrap.appendChild(a);
  });

  nav.insertBefore(wrap, nav.firstChild);
}

document.addEventListener('DOMContentLoaded', () => {
  buildNavSocials();
  if (typeof loadNavButtons === 'function') {
    loadNavButtons(NAV_SOURCES);
  }
});