
// ── Custom SDV Category Dropdown ─────────────────────────────────────────────
function toggleCatDrop() {
  const list = document.getElementById('catDropList');
  const wrap = document.querySelector('.sdv-dropdown-wrap');
  const isOpen = list.style.display !== 'none';
  list.style.display = isOpen ? 'none' : 'block';
  if (wrap) wrap.classList.toggle('open', !isOpen);
}

function selectCat(el) {
  const val = el.dataset.val;
  document.getElementById('browseCategoryFilter').value = val;
  document.getElementById('catDropLabel').textContent = el.dataset.label;
  // Update icon in button
  const iconWrap = document.getElementById('catDropIconWrap');
  const img = el.querySelector('.cat-item-img');
  iconWrap.innerHTML = '';
  if (img && img.src && img.naturalWidth > 0) {
    const clone = document.createElement('img');
    clone.src = img.src;
    clone.style.cssText = 'width:22px;height:22px;object-fit:contain;image-rendering:pixelated;';
    iconWrap.appendChild(clone);
  }
  document.querySelectorAll('.sdv-drop-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('catDropList').style.display = 'none';
  const wrap = document.querySelector('.sdv-dropdown-wrap');
  if (wrap) wrap.classList.remove('open');
  scheduleBrowseRender();
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
  const wrap = document.querySelector('.sdv-dropdown-wrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('catDropList').style.display = 'none';
    wrap.classList.remove('open');
  }
});

// ── Constants ─────────────────────────────────────────────────────────────────
const CACHE_KEY  = 'sdv_items_v1';
const CACHE_DAYS = 3;

const SOURCES = [
  { url: 'https://raw.githubusercontent.com/MateusAquino/stardewids/refs/heads/main/dist/objects.json',        prefix: '' },
  { url: 'https://raw.githubusercontent.com/MateusAquino/stardewids/refs/heads/main/dist/weapons.json',        prefix: '(W)' },
  { url: 'https://raw.githubusercontent.com/MateusAquino/stardewids/refs/heads/main/dist/tools.json',          prefix: '(T)' },
  { url: 'https://raw.githubusercontent.com/MateusAquino/stardewids/refs/heads/main/dist/big-craftables.json', prefix: '(BC)' },
  { url: 'https://raw.githubusercontent.com/MateusAquino/stardewids/refs/heads/main/dist/boots.json',          prefix: '(B)' },
  { url: 'https://raw.githubusercontent.com/MateusAquino/stardewids/refs/heads/main/dist/hats.json',           prefix: '(H)' },
  { url: 'https://raw.githubusercontent.com/MateusAquino/stardewids/refs/heads/main/dist/pants.json',          prefix: '(P)' },
  { url: 'https://raw.githubusercontent.com/MateusAquino/stardewids/refs/heads/main/dist/shirts.json',         prefix: '(S)' },
  { url: 'https://raw.githubusercontent.com/MateusAquino/stardewids/refs/heads/main/dist/furniture.json',      prefix: '(F)' },
  { url: 'https://raw.githubusercontent.com/MateusAquino/stardewids/refs/heads/main/dist/trinkets.json',       prefix: '(TR)' },
  { url: 'https://raw.githubusercontent.com/MateusAquino/stardewids/refs/heads/main/dist/flooring.json',       prefix: '(FL)' },
  { url: 'https://raw.githubusercontent.com/MateusAquino/stardewids/refs/heads/main/dist/wallpaper.json',      prefix: '(WP)' },
];

let items = [];

// ── Load with localStorage cache ─────────────────────────────────────────────
async function loadItems() {
  // Try cache first
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { ts, data } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_DAYS * 864e5) {
        items = data;
        onItemsReady();
        return;
      }
    }
  } catch(e) {}

  // Fetch all sources in parallel
  const results = await Promise.all(
    SOURCES.map(({ url, prefix }) =>
      fetch(url).then(r => r.json()).then(arr =>
        arr.map(item => ({ item, prefix }))
      ).catch(() => [])
    )
  );

  items = results.flat().map(({ item, prefix }) => ({
    name:  (item.names?.['data-en-US'] || String(item.id)).toLowerCase(),
    id:    prefix + item.id,
    image: item.image ? 'data:image/png;base64,' + item.image : '',
  }));

  // Save to cache
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: items }));
  } catch(e) {}

  onItemsReady();
}

function onItemsReady() {
  populateCatIcons();
  initBrowseGrid();
}

// Populate category dropdown with real item images after data loads
function populateCatIcons() {
  const catMap = {
    'OBJ':  { test: id => /^\d+$/.test(String(id)),         imgId: 'cat-img-OBJ', symId: 'cat-sym-OBJ' },
    '(W)':  { test: id => String(id).startsWith('(W)'),      imgId: 'cat-img-W',   symId: 'cat-sym-W'   },
    '(T)':  { test: id => String(id).startsWith('(T)'),      imgId: 'cat-img-T',   symId: 'cat-sym-T'   },
    '(BC)': { test: id => String(id).startsWith('(BC)'),     imgId: 'cat-img-BC',  symId: 'cat-sym-BC'  },
    '(B)':  { test: id => String(id).startsWith('(B)'),      imgId: 'cat-img-B',   symId: 'cat-sym-B'   },
    '(H)':  { test: id => String(id).startsWith('(H)'),      imgId: 'cat-img-H',   symId: 'cat-sym-H'   },
    '(P)':  { test: id => String(id).startsWith('(P)'),      imgId: 'cat-img-P',   symId: 'cat-sym-P'   },
    '(S)':  { test: id => String(id).startsWith('(S)'),      imgId: 'cat-img-S',   symId: 'cat-sym-S'   },
    '(F)':  { test: id => String(id).startsWith('(F)'),      imgId: 'cat-img-F',   symId: 'cat-sym-F'   },
    '(TR)': { test: id => String(id).startsWith('(TR)'),     imgId: 'cat-img-TR',  symId: 'cat-sym-TR'  },
    '(FL)': { test: id => String(id).startsWith('(FL)'),     imgId: 'cat-img-FL',  symId: 'cat-sym-FL'  },
    '(WP)': { test: id => String(id).startsWith('(WP)'),     imgId: 'cat-img-WP',  symId: 'cat-sym-WP'  },
  };
  for (const [, cfg] of Object.entries(catMap)) {
    const found = items.find(item => cfg.test(item.id) && item.image);
    const imgEl = document.getElementById(cfg.imgId);
    const symEl = document.getElementById(cfg.symId);
    if (found && imgEl) {
      imgEl.src = found.image;
      imgEl.style.display = 'inline-block';
      if (symEl) symEl.style.display = 'none';
    } else if (imgEl) {
      imgEl.style.display = 'none';
    }
  }
}

loadItems();

// ══════════════════════════════════════════════════════════════════════════════
// BROWSE ALL ITEMS — Virtual scroll grid
// ══════════════════════════════════════════════════════════════════════════════

const browseFilter    = document.getElementById('browseFilter');
const browseCatFilter = document.getElementById('browseCategoryFilter');
const browseGrid      = document.getElementById('browseGrid');
const browseCount     = document.getElementById('browseCount');
const browseSelectedBar  = document.getElementById('browseSelectedBar');
const browseOutputWrap   = document.getElementById('browseOutputWrap');
const browseSelImg    = document.getElementById('browseSelImg');
const browseSelName   = document.getElementById('browseSelName');
const browseSelId     = document.getElementById('browseSelId');
const browseQtyInput  = document.getElementById('browseQty');
const browseCondInput = document.getElementById('browseCond');
const browseCondError = document.getElementById('browseCondError');
const browseOutput    = document.getElementById('browseOutput');
const browseCopyLabel = document.getElementById('browseCopyLabel');

let browseCurrentItem = null;
let browseCopyTO      = null;
let browseRenderTO    = null;
let browseFiltered    = [];
let browseRendered    = 0;
const BROWSE_PAGE     = 60;

browseFilter.addEventListener('input',    scheduleBrowseRender);
// category handled by custom dropdown
browseQtyInput.addEventListener('input',   updateBrowseOutput);
browseCondInput.addEventListener('input',  () => { validateBrowseCond(); updateBrowseOutput(); });

function initBrowseGrid() {
  browseCount.textContent = items.length + ' items';
  browseGrid.addEventListener('scroll', onBrowseScroll);
  scheduleBrowseRender();
}

function onBrowseScroll() {
  const el = browseGrid;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
    loadMoreBrowseCards();
  }
}

function scheduleBrowseRender() {
  clearTimeout(browseRenderTO);
  browseRenderTO = setTimeout(renderBrowseGrid, 120);
}

function renderBrowseGrid() {
  const filterVal = browseFilter.value.trim().toLowerCase();
  const catVal    = browseCatFilter.value;

  const catVal2 = document.getElementById('browseCategoryFilter').value;
  browseFiltered = items.filter(item => {
    if (catVal2 !== '') {
      if (catVal2 === 'OBJ') {
        if (!/^\d+$/.test(String(item.id))) return false;
      } else {
        if (!String(item.id).startsWith(catVal2)) return false;
      }
    }
    if (filterVal && !item.name.includes(filterVal) && !String(item.id).toLowerCase().includes(filterVal)) return false;
    return true;
  });

  browseCount.textContent = browseFiltered.length + ' / ' + items.length + ' items';
  browseGrid.innerHTML = '';
  browseRendered = 0;

  if (!browseFiltered.length) {
    browseGrid.innerHTML = '<div class="basket-empty" style="padding:40px; grid-column:1/-1;">No items found ✦</div>';
    return;
  }

  loadMoreBrowseCards();
}

function loadMoreBrowseCards() {
  if (browseRendered >= browseFiltered.length) return;
  const end  = Math.min(browseRendered + BROWSE_PAGE, browseFiltered.length);
  const frag = document.createDocumentFragment();
  for (let i = browseRendered; i < end; i++) {
    frag.appendChild(makeBrowseCard(browseFiltered[i]));
  }
  browseRendered = end;
  browseGrid.appendChild(frag);
}

function makeBrowseCard(item) {
  const card = document.createElement('div');
  card.className = 'browse-card' + (browseCurrentItem && browseCurrentItem.id === item.id ? ' selected' : '');
  card.dataset.id = item.id;

  if (item.image) {
    const img = document.createElement('img');
    img.className = 'browse-card-img';
    img.loading = 'lazy';
    img.src = item.image;
    img.alt = item.name;
    img.onerror = function() { this.replaceWith(makeFallbackIcon()); };
    card.appendChild(img);
  } else {
    card.appendChild(makeFallbackIcon());
  }

  const idEl = document.createElement('div');
  idEl.className = 'browse-card-id';
  idEl.textContent = item.id;
  card.appendChild(idEl);

  const nameEl = document.createElement('div');
  nameEl.className = 'browse-card-name';
  nameEl.textContent = item.name;
  card.appendChild(nameEl);

  card.addEventListener('click', () => selectBrowseItem(item, card));
  return card;
}

function makeFallbackIcon() {
  const el = document.createElement('div');
  el.className = 'browse-card-noimg';
  el.textContent = '📦';
  return el;
}

function selectBrowseItem(item, cardEl) {
  browseGrid.querySelectorAll('.browse-card.selected').forEach(c => c.classList.remove('selected'));
  cardEl.classList.add('selected');
  browseCurrentItem = item;

  browseSelImg.src = item.image || '';
  browseSelImg.alt = item.name;
  browseSelImg.style.display = item.image ? '' : 'none';
  browseSelName.textContent = item.name.toUpperCase();
  browseSelId.textContent   = '✦ ID: ' + item.id;

  browseSelectedBar.style.display  = 'flex';
  browseOutputWrap.style.display   = 'block';

  cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  updateBrowseOutput();
}

function updateBrowseOutput() {
  if (!browseCurrentItem) return;
  const qty  = parseInt(browseQtyInput.value, 10);
  const cond = parseInt(browseCondInput.value, 10);
  let cmd = '/item ' + browseCurrentItem.id;
  if (browseQtyInput.value && !isNaN(qty) && qty > 0) cmd += ' ' + qty;
  if (browseCondInput.value !== '' && !isNaN(cond) && cond >= 0 && cond <= 4) cmd += ' ' + cond;
  browseOutput.textContent = cmd;
  browseOutput.classList.add('has-value');
}

function validateBrowseCond() {
  const val = parseInt(browseCondInput.value, 10);
  if (browseCondInput.value === '') { browseCondError.textContent = ''; return true; }
  if (isNaN(val) || val < 0 || val > 4) {
    browseCondError.textContent = '⚠ Must be 0–4!';
    return false;
  }
  browseCondError.textContent = '';
  return true;
}

function copyBrowse() {
  const text = browseOutput.textContent;
  if (!text || !browseOutput.classList.contains('has-value')) return;
  const doCopy = () => {
    clearTimeout(browseCopyTO);
    browseCopyLabel.textContent = '✅ Copied!';
    browseCopyTO = setTimeout(() => { browseCopyLabel.textContent = '📋 Copy'; }, 2000);
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(doCopy).catch(() => fallbackCopy(text, doCopy));
  } else {
    fallbackCopy(text, doCopy);
  }
}

function fallbackCopy(text, cb) {
  const el = document.createElement('textarea');
  el.value = text;
  Object.assign(el.style, { position: 'fixed', opacity: '0' });
  document.body.appendChild(el);
  el.focus(); el.select();
  try { document.execCommand('copy'); cb(); } catch(e) {}
  document.body.removeChild(el);
}

function clearBrowseFilter() {
  browseFilter.value = '';
  document.getElementById('browseCategoryFilter').value = '';
  document.getElementById('catDropLabel').textContent = 'All Categories';
  document.getElementById('catDropIconWrap').innerHTML = '';
  document.querySelectorAll('.sdv-drop-item').forEach(i => i.classList.remove('active'));
  const first = document.querySelector('.sdv-drop-item');
  if (first) first.classList.add('active');
  scheduleBrowseRender();
}

function clearBrowseSelection() {
  browseCurrentItem = null;
  browseGrid.querySelectorAll('.browse-card.selected').forEach(c => c.classList.remove('selected'));
  browseSelectedBar.style.display = 'none';
  browseOutputWrap.style.display  = 'none';
  browseQtyInput.value  = '';
  browseCondInput.value = '';
  browseCondError.textContent = '';
  clearTimeout(browseCopyTO);
  browseCopyLabel.textContent = '📋 Copy';
}

// ══════════════════════════════════════════════════════════════════════════════
// CHEAT CODES PANEL
// ══════════════════════════════════════════════════════════════════════════════

document.querySelectorAll('.cheat-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.cheat-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const cat = tab.dataset.cat;
    document.querySelectorAll('.cheat-row').forEach(row => {
      row.classList.toggle('hidden', cat !== 'all' && row.dataset.cat !== cat);
    });
  });
});

let cheatToastTimer = null;

function copyCheat(el) {
  const text = el.textContent.trim();
  const doToast = () => {
    el.classList.add('copied');
    setTimeout(() => el.classList.remove('copied'), 1200);
    const toast = document.getElementById('cheatToast');
    toast.classList.add('show');
    clearTimeout(cheatToastTimer);
    cheatToastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(doToast).catch(() => {
      fallbackCopy(text, doToast);
    });
  } else {
    fallbackCopy(text, doToast);
  }
}
