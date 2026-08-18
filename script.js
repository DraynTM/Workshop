const loadedFonts = new Set(); // what are u looking for? there is no something interesting.

function loadGoogleFont(fontName) {
  if (!fontName || loadedFonts.has(fontName)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(fontName);
}

function loadFontAwesome() {
  if (document.getElementById('font-awesome-cdn')) return;
  const link = document.createElement('link');
  link.id = 'font-awesome-cdn';
  link.rel = 'stylesheet';
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
  document.head.appendChild(link);
}

function applyStyle(el, obj) {
  if (!obj || typeof obj !== 'object') return;


  if (obj.gradient) {
    el.style.background = obj.gradient;
    el.style.webkitBackgroundClip = 'text';
    el.style.backgroundClip = 'text';
    el.style.webkitTextFillColor = 'transparent';
    if (!el.style.display || el.style.display === 'inline') {
      el.style.display = 'inline-block';
    }
  }

  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null || val === '' || key === 'gradient') continue;
    if (key in el.style) {
      try { el.style[key] = val; } catch (e) { /* ignore [BIG SHOT] values */ }
    }
  }
}

function applyAliases(el, obj, aliasMap) {
  if (!obj) return;
  for (const [alias, cssProp] of Object.entries(aliasMap)) {
    if (obj[alias] !== undefined && obj[alias] !== null && obj[alias] !== '') {
      el.style[cssProp] = obj[alias];
    }
  }
}

function resolveJustify(align) {
  if (align === 'center') return 'center';
  if (align === 'right') return 'flex-end';
  if (align === 'left') return 'flex-start';
  return null;
}

function createNavButtonElement(data) {
  const el = document.createElement('a');
  el.className = 'nav-btn' + (data.className ? ` ${data.className}` : '');
  if (data.id) el.id = data.id;

  if (data.action === 'scroll') {
    el.href = `#${data.target || ''}`;
  } else {
    el.href = data.url || '#';
    el.target = data.target || '_self';
    if (el.target === '_blank') el.rel = 'noopener';
  }

  if (data.icon) {
    loadFontAwesome();
    const i = document.createElement('i');
    i.className = data.icon;
    el.appendChild(i);
  }
  if (data.text) el.appendChild(document.createTextNode(data.text));

  applyAliases(el, data, { bg: 'background', color: 'color' });
  applyStyle(el, data); 

  return el;
}

function applyLinksConfig(config) {
  const { linksBlock } = config;
  const container = document.querySelector('.links-container');
  const textElement = document.querySelector('.links-text');

  if (!container || !textElement) return;

  if (linksBlock.showOverlay) {
    container.style.background = linksBlock.overlayBackground || 'rgba(0, 0, 0, 0.6)';
  } else {
    container.style.background = 'transparent';
  }

  textElement.style.fontSize = linksBlock.fontSize;
  textElement.style.color = linksBlock.textColor;
  textElement.style.textShadow = linksBlock.textShadow;
}

async function loadNavButtons(sources) {
  const nav = document.getElementById('top-nav-inner');
  if (!nav) return;

  loadGoogleFont('El Messiri');

  const buttons = new Array(sources.length);

  await Promise.all(sources.map(async (src, i) => {
    try {
      const response = await fetch(src, { cache: 'no-store' });
      if (!response.ok) throw new Error(`err: ${src}`);
      const data = await response.json();
      buttons[i] = createNavButtonElement(data);
    } catch (err) {
      console.error(`err (${src}):`, err);
    }
  }));

  buttons.forEach(btn => { if (btn) nav.appendChild(btn); });
}

function initFooterEmailCopy() {
  const btn = document.getElementById('footer-email');
  if (!btn) return;

  const emailTextEl = btn.querySelector('.footer-email-text');
  const email = btn.dataset.email || (emailTextEl ? emailTextEl.textContent : '');
  let resetTimer = null;

  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(email);
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = email;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
    }

    btn.classList.add('copied');
    if (emailTextEl) emailTextEl.textContent = 'Copied!';

    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      btn.classList.remove('copied');
      if (emailTextEl) emailTextEl.textContent = email;
    }, 1500);
  });
}

async function loadWorkshopBlocks(sources) {
  const container = document.getElementById('workshop-container');
  if (!container) return;

  const sections = new Array(sources.length);

  await Promise.all(sources.map(async (src, i) => {
    try {
      const response = await fetch(src, { cache: 'no-store' });
      if (!response.ok) throw new Error(`err: ${src}`);
      const data = await response.json();
      sections[i] = createBlockElement(data);
    } catch (err) {
      console.error(`err (${src}):`, err);
    }
  }));

  sections.forEach(section => { if (section) container.appendChild(section); });
  initScrollReveal(container);
}

function initScrollReveal(container) {
  const blocks = container.querySelectorAll('.workshop-block');
  if (!('IntersectionObserver' in window)) {
    blocks.forEach(b => b.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  blocks.forEach(b => observer.observe(b));
}

function createGalleryElement(images, style) {
  if (!Array.isArray(images) || images.length === 0) return null;

  const normalized = images.map(item => (typeof item === 'string' ? { url: item } : item));

  const wrap = document.createElement('div');
  wrap.className = 'gallery';
  applyStyle(wrap, style);

  const viewport = document.createElement('div');
  viewport.className = 'gallery-viewport';

  const img = document.createElement('img');
  img.className = 'gallery-image';
  img.loading = 'lazy';
  viewport.appendChild(img);

  const footer = document.createElement('div');
  footer.className = 'gallery-footer';

  const dotsWrap = document.createElement('div');
  dotsWrap.className = 'gallery-dots';

  const counter = document.createElement('span');
  counter.className = 'gallery-counter';

  let index = 0;
  const dots = normalized.map((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'gallery-dot';
    dot.addEventListener('click', () => { index = i; render(); });
    dotsWrap.appendChild(dot);
    return dot;
  });

  function render() {
    img.src = normalized[index].url;
    img.alt = normalized[index].alt || `Screenshot ${index + 1}`;
    dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
    counter.innerText = `${index + 1} / ${normalized.length}`;
  }

  if (normalized.length > 1) {
    loadFontAwesome();

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'gallery-nav gallery-prev';
    prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    prevBtn.addEventListener('click', () => {
      index = (index - 1 + normalized.length) % normalized.length;
      render();
    });

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'gallery-nav gallery-next';
    nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    nextBtn.addEventListener('click', () => {
      index = (index + 1) % normalized.length;
      render();
    });

    viewport.appendChild(prevBtn);
    viewport.appendChild(nextBtn);
  }

  footer.appendChild(dotsWrap);
  footer.appendChild(counter);

  wrap.appendChild(viewport);
  wrap.appendChild(footer);

  render();
  return wrap;
}

function createBlockElement(data) {
  const section = document.createElement('section');
  section.className = 'workshop-block';
  if (data.id) section.id = data.id;
  if (data.className) section.classList.add(...data.className.split(/\s+/).filter(Boolean));

  const style = data.style || {};
  if (style.googleFont) loadGoogleFont(style.googleFont);

  if (style.parallax) {
    section.classList.add('has-parallax-bg');
  }

  const { maxWidth: blockMaxWidth, backgroundVideo, ...sectionStyle } = style;

  if (backgroundVideo) {
    section.classList.add('has-bg-video');

    const video = document.createElement('video');
    video.className = 'block-bg-video';
    video.src = backgroundVideo;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    section.appendChild(video);

    if (sectionStyle.background) {
      const overlay = document.createElement('div');
      overlay.className = 'block-bg-overlay';
      overlay.style.background = sectionStyle.background;
      section.appendChild(overlay);
      delete sectionStyle.background;
    }
  }

  applyStyle(section, sectionStyle);

  const inner = document.createElement('div');
  inner.className = 'block-inner';
  if (blockMaxWidth) inner.style.maxWidth = blockMaxWidth;

  const layout = data.layout || {};
  inner.style.flexDirection = layout.direction || 'row';
  inner.style.alignItems = layout.alignItems || 'center';
  inner.style.justifyContent = layout.justifyContent || 'space-between';
  inner.style.gap = layout.gap || '40px';
  if (layout.wrap) inner.style.flexWrap = layout.wrap;
  if (layout.reverse) inner.style.flexDirection = (layout.direction || 'row') + '-reverse';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'block-content';
  contentDiv.style.textAlign = layout.textAlign || 'left';
  applyStyle(contentDiv, layout.contentStyle);

  const headerAlign = data.header?.align || data.header?.textAlign || layout.textAlign;

  if (Array.isArray(data.tags) && data.tags.length > 0) {
    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'tags-container';
    const justify = resolveJustify(headerAlign);
    if (justify) tagsDiv.style.justifyContent = justify;

    data.tags.forEach(tag => {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'tag-item' + (tag.className ? ` ${tag.className}` : '');
      if (tag.html) {
        tagSpan.innerHTML = tag.html;
      } else {
        tagSpan.innerText = tag.text || '';
      }

      if (tag.bgImage) {
        tagSpan.style.backgroundImage = `url('${tag.bgImage}')`;
        tagSpan.classList.add('tag-item--image');
      }
      applyAliases(tagSpan, tag, { bg: 'background', color: 'color' });
      applyStyle(tagSpan, tag);

      tagsDiv.appendChild(tagSpan);
    });
    contentDiv.appendChild(tagsDiv);
  }

  if (data.header) {
    const headerDiv = document.createElement('div');
    headerDiv.className = 'block-header';
    headerDiv.style.textAlign = headerAlign || 'left';
    applyAliases(headerDiv, data.header, { bg: 'background' });
    applyStyle(headerDiv, { padding: data.header.padding, margin: data.header.margin, borderRadius: data.header.borderRadius });

    if (data.header.subtitle) {
      const sub = document.createElement('span');
      sub.className = 'block-subtitle';
      sub.innerText = data.header.subtitle;
      sub.style.color = data.header.subtitleColor || '#888';
      sub.style.fontSize = data.header.subtitleSize || '0.9rem';
      sub.style.fontWeight = data.header.subtitleWeight || '600';
      sub.style.textTransform = data.header.subtitleTransform || 'uppercase';
      sub.style.letterSpacing = data.header.subtitleLetterSpacing || '1.5px';
      headerDiv.appendChild(sub);
    }

    if (data.header.titleImage) {
      const titleImg = document.createElement('img');
      titleImg.className = 'block-header-image';
      titleImg.src = data.header.titleImage;
      titleImg.alt = data.header.titleImageAlt || data.header.title || '';
      applyStyle(titleImg, data.header.titleImageStyle);
      headerDiv.appendChild(titleImg);
    } else if (data.header.title) {
      const title = document.createElement('h2');
      title.innerText = data.header.title;
      title.style.color = data.header.titleColor || '#fff';
      title.style.fontSize = data.header.titleSize || 'clamp(2.2rem, 6vw, 3.4rem)';
      title.style.fontWeight = data.header.titleWeight || '700';
      title.style.lineHeight = data.header.titleLineHeight || '1.15';
      applyStyle(title, data.header);
      headerDiv.appendChild(title);
    }

    contentDiv.appendChild(headerDiv);
  }

  if (data.content) {
    const items = Array.isArray(data.content) ? data.content : [data.content];
    items.forEach(item => {
      if (!item) return;
      const p = document.createElement('div');
      p.className = 'block-text';
      if (item.html) {
        p.innerHTML = item.html;
      } else {
        p.innerHTML = item.text || '';
      }
      applyAliases(p, item, { bg: 'background', textColor: 'color' });
      p.style.fontSize = item.fontSize || '1rem';
      p.style.lineHeight = item.lineHeight || '1.6';
      applyStyle(p, item); 
      contentDiv.appendChild(p);
    });
  }

  if (Array.isArray(data.gallery) && data.gallery.length > 0) {
    const galleryEl = createGalleryElement(data.gallery, data.galleryStyle);
    if (galleryEl) contentDiv.appendChild(galleryEl);
  }

  if (data.speechBubble) {
    const sb = data.speechBubble;
    loadGoogleFont(sb.googleFont || 'El Messiri');

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'speech-bubble';
    applyStyle(bubbleDiv, sb);

    const img = document.createElement('img');
    img.src = sb.image;
    img.alt = sb.alt || 'Dialogue Bubble';

    const content = document.createElement('div');
    content.className = 'speech-bubble-content';

    const textP = document.createElement('p');
    textP.innerHTML = sb.text || '';
    if (sb.fontFamily) textP.style.fontFamily = sb.fontFamily;
    applyAliases(textP, sb, { textColor: 'color' });
    applyStyle(textP, { fontSize: sb.textFontSize, lineHeight: sb.textLineHeight });

    content.appendChild(textP);
    bubbleDiv.appendChild(img);
    bubbleDiv.appendChild(content);
    contentDiv.appendChild(bubbleDiv);
  }

  if (data.buttons) {
    const isObjectForm = !Array.isArray(data.buttons) && typeof data.buttons === 'object';
    const buttonsList = isObjectForm ? data.buttons.items : data.buttons;

    if (Array.isArray(buttonsList) && buttonsList.length > 0) {
      const btnDiv = document.createElement('div');
      btnDiv.className = 'buttons-container';
      const justify = resolveJustify(headerAlign);
      if (justify) btnDiv.style.justifyContent = justify;

      buttonsList.forEach(btn => {
        const a = document.createElement('a');
        a.className = btn.className || 'btn-link';
        a.href = btn.url || '#';
        a.target = btn.target || '_blank';
        a.rel = 'noopener';
        if (btn.ariaLabel) a.setAttribute('aria-label', btn.ariaLabel);
        if (btn.title) a.title = btn.title;

        if (btn.icon) {
          loadFontAwesome();
          a.innerHTML = `<i class="${btn.icon}"></i>`;
        } else if (btn.imageUrl) {
          const img = document.createElement('img');
          img.src = btn.imageUrl;
          img.alt = btn.ariaLabel || '';
          img.className = 'btn-icon-img';
          a.appendChild(img);
        } else if (btn.html) {
          a.innerHTML = btn.html;
        } else if (btn.text) {
          a.innerText = btn.text;
        }

        applyAliases(a, btn, { bg: 'background', color: 'color' });
        applyStyle(a, btn);
        btnDiv.appendChild(a);
      });

      if (isObjectForm) {
        section.classList.add('has-buttons-bar');

        const sectionWrap = document.createElement('div');
        sectionWrap.className = 'buttons-section';

        if (data.buttons.overlay === false) {
          sectionWrap.classList.add('no-overlay');
        } else {
          sectionWrap.classList.add('has-overlay');
        }

        if (data.buttons.label) {
          const labelEl = document.createElement('span');
          labelEl.className = 'buttons-label';
          labelEl.innerText = data.buttons.label;
          applyStyle(labelEl, {
            color: data.buttons.labelColor,
            fontSize: data.buttons.labelFontSize,
            fontWeight: data.buttons.labelFontWeight,
            letterSpacing: data.buttons.labelLetterSpacing,
            textTransform: data.buttons.labelTransform,
            textShadow: data.buttons.labelTextShadow
          });
          sectionWrap.appendChild(labelEl);
        }
        
        sectionWrap.appendChild(btnDiv);
        section.appendChild(sectionWrap);
      } else {
        contentDiv.appendChild(btnDiv);
      }
    }
  }

  let mediaDiv = null;
  if (data.media) {
    const media = data.media;
    mediaDiv = document.createElement('div');
    mediaDiv.className = 'block-media';
    applyStyle(mediaDiv, { order: media.order, alignSelf: media.alignSelf });

    let mediaEl;
    if (media.type === 'video') {
      mediaEl = document.createElement('video');
      mediaEl.src = media.url;
      if (media.poster) mediaEl.poster = media.poster;
      mediaEl.autoplay = media.autoplay ?? true;
      mediaEl.loop = media.loop ?? true;
      mediaEl.muted = media.muted ?? true;
      mediaEl.controls = media.controls ?? false;
      mediaEl.playsInline = true;
    } else {
      mediaEl = document.createElement('img');
      mediaEl.src = media.url;
      mediaEl.alt = media.alt || '';
      mediaEl.loading = media.loading || 'lazy';
    }

    applyStyle(mediaEl, media);
    mediaDiv.appendChild(mediaEl);
  }

  inner.appendChild(contentDiv);
  if (mediaDiv) inner.appendChild(mediaDiv);
  section.appendChild(inner);

  return section;
}

document.addEventListener('DOMContentLoaded', initFooterEmailCopy);