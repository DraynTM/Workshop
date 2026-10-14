
(function () {
  'use strict';

  const CACHE_TTL = 24 * 60 * 60 * 1000;

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  }

  function prep(text) {
    const n = norm(text);
    return { raw: text, norm: n, compact: n.replace(/ /g, ''), tokens: n ? n.split(' ') : [] };
  }


  function dl(a, b) {
    const al = a.length, bl = b.length;
    if (!al) return bl;
    if (!bl) return al;
    let prev2 = null;
    let prev = new Array(bl + 1);
    let cur = new Array(bl + 1);
    for (let j = 0; j <= bl; j++) prev[j] = j;
    for (let i = 1; i <= al; i++) {
      cur[0] = i;
      for (let j = 1; j <= bl; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          v = Math.min(v, prev2[j - 2] + 1);
        }
        cur[j] = v;
      }
      prev2 = prev;
      prev = cur;
      cur = new Array(bl + 1);
    }
    return prev[bl];
  }

  function sim(a, b) {
    const m = Math.max(a.length, b.length);
    return m ? 1 - dl(a, b) / m : 1;
  }

  function trigrams(s) {
    const p = '  ' + s + ' ';
    const set = new Set();
    for (let i = 0; i < p.length - 2; i++) set.add(p.slice(i, i + 3));
    return set;
  }

  function dice(a, b) {
    if (!a || !b) return 0;
    const A = trigrams(a), B = trigrams(b);
    let common = 0;
    A.forEach(x => { if (B.has(x)) common++; });
    return (2 * common) / (A.size + B.size);
  }


  function tokenSim(qt, tt) {
    let s = sim(qt, tt);
    if (qt.length >= 3) {
      s = Math.max(s, 0.95 * sim(qt, tt.slice(0, qt.length)));
      if (tt.includes(qt)) s = Math.max(s, 0.85); 
    }
    return s;
  }

  function score(q, t) {
    if (!q.norm) return 0;
    if (q.norm === t.norm) return 1;

    let best = 0;
    const qc = q.compact, tc = t.compact;

    if (t.norm.startsWith(q.norm)) {
      best = 0.92 + 0.08 * (q.norm.length / t.norm.length);
    } else if (qc.length >= 3 && tc.includes(qc)) {
      best = 0.8 + 0.1 * (qc.length / tc.length);
    }

    best = Math.max(best, sim(qc, tc));
    if (qc.length >= 3) {
      best = Math.max(best, 0.9 * sim(qc, tc.slice(0, qc.length)));
    }


    if (q.tokens.length && t.tokens.length) {
      let sum = 0;
      for (const qt of q.tokens) {
        let m = 0;
        for (const tt of t.tokens) {
          const s = tokenSim(qt, tt);
          if (s > m) m = s;
        }
        sum += m;
      }
      best = Math.max(best, 0.95 * (sum / q.tokens.length));
    }

    best = Math.max(best, 0.95 * dice(qc, tc));

    return best;
  }

  function threshold(len) {
    if (len <= 3) return 0.75;
    if (len <= 5) return 0.6;
    return 0.5;
  }

  function fuzzySearch(index, query, limit) {
    const q = prep(query);
    if (q.compact.length < 2) return [];
    const min = threshold(q.compact.length);
    const out = [];
    for (const t of index) {
      const s = score(q, t);
      if (s >= min) out.push({ title: t.raw, score: s });
    }
    out.sort((a, b) => b.score - a.score || a.title.length - b.title.length);
    return out.slice(0, limit);
  }


  async function loadIndex(api) {
    const key = 'wikiIndex:' + api;
    try {
      const c = JSON.parse(localStorage.getItem(key));
      if (c && Date.now() - c.t < CACHE_TTL && Array.isArray(c.titles) && c.titles.length) return c.titles;
    } catch (e) { /* no cache */ }

    const titles = [];
    let cont = null;
    for (let i = 0; i < 40; i++) {
      const url = `${api}?action=query&list=allpages&aplimit=max&format=json&formatversion=2&origin=*` +
        (cont ? `&apcontinue=${encodeURIComponent(cont)}` : '');
      const res = await fetch(url);
      if (!res.ok) throw new Error('wiki api ' + res.status);
      const json = await res.json();
      (json.query?.allpages || []).forEach(p => titles.push(p.title));
      cont = json.continue?.apcontinue;
      if (!cont) break;
    }
    try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), titles })); } catch (e) { /* quota */ }
    return titles;
  }

  async function remoteSearch(api, query, limit) {
    const url = `${api}?action=query&list=search&srsearch=${encodeURIComponent(query)}` +
      `&srlimit=${limit}&format=json&formatversion=2&origin=*`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('wiki search ' + res.status);
    const json = await res.json();
    return (json.query?.search || []).map(r => r.title);
  }

  function pageUrl(base, title) {
    return `${base}/wiki/${encodeURIComponent(title.replace(/ /g, '_')).replace(/%2F/g, '/')}`;
  }


  function createWikiSearchElement(cfg) {
    if (!cfg || !cfg.baseUrl) return null;
    const base = cfg.baseUrl.replace(/\/+$/, '');
    const api = base + '/api.php';
    const limit = cfg.maxResults || 8;

    const wrap = document.createElement('div');
    wrap.className = 'wiki-search';

    const box = document.createElement('div');
    box.className = 'wiki-search-box';

    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-magnifying-glass wiki-search-icon';

    const input = document.createElement('input');
    input.type = 'search';
    input.className = 'wiki-search-input';
    input.placeholder = cfg.placeholder || 'Search the fan wiki...';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', cfg.label || 'Wiki search');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');

    box.appendChild(icon);
    box.appendChild(input);

    const list = document.createElement('ul');
    list.className = 'wiki-search-results';
    list.setAttribute('role', 'listbox');
    list.hidden = true;

    wrap.appendChild(box);
    wrap.appendChild(list);

    let index = null;     
    let indexError = false;
    let loading = null;
    let active = -1;
    let items = [];
    let timer = null;
    let seq = 0;

    function ensureIndex() {
      if (index || loading) return loading;
      loading = loadIndex(api)
        .then(titles => { index = titles.map(prep); })
        .catch(err => { console.error('wiki index:', err); indexError = true; })
        .finally(() => { loading = null; });
      return loading;
    }

    function setActive(i) {
      active = i;
      [...list.children].forEach((li, n) => li.classList.toggle('is-active', n === i));
    }

    function render(results, message) {
      list.innerHTML = '';
      items = results;
      active = -1;

      if (message) {
        const li = document.createElement('li');
        li.className = 'wiki-search-msg';
        li.textContent = message;
        list.appendChild(li);
      }

      results.forEach(r => {
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        const a = document.createElement('a');
        a.href = pageUrl(base, r.title);
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = r.title;
        li.appendChild(a);
        list.appendChild(li);
      });

      const q = input.value.trim();
      if (q) {
        const li = document.createElement('li');
        li.className = 'wiki-search-all';
        const a = document.createElement('a');
        a.href = `${base}/wiki/Special:Search?query=${encodeURIComponent(q)}`;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = `Search "${q}" on the wiki →`;
        li.appendChild(a);
        list.appendChild(li);
      }

      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    function hide() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    }

    async function run() {
      const q = input.value.trim();
      const my = ++seq;
      if (q.length < 2) { hide(); return; }

      await ensureIndex();
      if (my !== seq) return;

      let results = index ? fuzzySearch(index, q, limit) : [];

      if (!results.length || results[0].score < 0.7) {
        try {
          const remote = await remoteSearch(api, q, limit);
          if (my !== seq) return;
          const seen = new Set(results.map(r => r.title));
          remote.forEach(t => { if (!seen.has(t)) results.push({ title: t, score: 0 }); });
          results = results.slice(0, limit);
        } catch (e) {
          if (indexError && !results.length) {
            render([], 'Search is unavailable right now.');
            return;
          }
        }
      }

      render(results, results.length ? '' : 'Nothing found');
    }

    input.addEventListener('focus', ensureIndex);
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(run, 150);
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { hide(); return; }
      if (list.hidden || !items.length) {
        if (e.key === 'Enter') { clearTimeout(timer); run(); }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((active + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((active - 1 + items.length) % items.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = items[active >= 0 ? active : 0];
        if (target) window.open(pageUrl(base, target.title), '_blank', 'noopener');
      }
    });

    document.addEventListener('click', e => {
      if (!wrap.contains(e.target)) hide();
    });

    return wrap;
  }

  window.createWikiSearchElement = createWikiSearchElement;
  window.__wikiFuzzy = { fuzzySearch, prep };
})();
