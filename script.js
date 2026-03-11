// ── Load all items from GitHub ───────────────────────────────────────────────
// Each source has a prefix that gets prepended to the numeric ID
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

async function loadItems() {
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

  const nameInput = document.getElementById('searchName');
  if (nameInput) nameInput.placeholder = 'Search ' + items.length + ' items...';
}

loadItems();

// ── DOM ──────────────────────────────────────────────────────────────────────
const nameInput       = document.getElementById("searchName");
const idInput         = document.getElementById("searchID");
const quantityInput   = document.getElementById("quantity");
const conditionInput  = document.getElementById("condition");
const output          = document.getElementById("output");
const itemImage       = document.getElementById("itemImage");
const imagePlaceholder= document.getElementById("imagePlaceholder");
const itemBadge       = document.getElementById("itemBadge");
const conditionError  = document.getElementById("conditionError");
const copyLabel       = document.getElementById("copyLabel");
const starsRow        = document.getElementById("starsRow");
const suggestionBox   = document.getElementById("suggestionBox");

// ── State ─────────────────────────────────────────────────────────────────────
let currentItem   = null;
let copyTimeout   = null;
let activeSuggest = -1;

// ── Events ───────────────────────────────────────────────────────────────────
nameInput.addEventListener("input",   () => { showSuggestions(); findItem(); });
nameInput.addEventListener("keydown", handleSuggestKey);
nameInput.addEventListener("blur",    () => setTimeout(closeSuggestions, 150));
idInput.addEventListener("input",     findItem);
quantityInput.addEventListener("input",  updateOutput);
conditionInput.addEventListener("input", () => { validateCondition(); updateOutput(); });
itemImage.addEventListener("error",   () => hideImage());

// ── Suggestions ──────────────────────────────────────────────────────────────
function showSuggestions() {
  const val = nameInput.value.trim().toLowerCase();
  suggestionBox.innerHTML = "";
  activeSuggest = -1;
  if (!val) { closeSuggestions(); return; }

  const matches = items.filter(item =>
    item.name.includes(val) || item.id.toLowerCase().includes(val)
  ).slice(0, 40);

  if (!matches.length) { closeSuggestions(); return; }

  matches.forEach(item => {
    const div = document.createElement("div");
    div.className = "suggestion-item";
    const idx = item.name.indexOf(val);
    if (idx >= 0) {
      const before = item.name.slice(0, idx);
      const match  = item.name.slice(idx, idx + val.length);
      const after  = item.name.slice(idx + val.length);
      div.innerHTML =
        '<img class="sug-thumb" src="' + item.image + '" alt="' + item.name + '" onerror="this.style.display=\'none\'"/>' +
        '<span class="sug-id">' + item.id + '</span> ' + before + '<mark>' + match + '</mark>' + after;
    } else {
      div.innerHTML =
        '<img class="sug-thumb" src="' + item.image + '" alt="' + item.name + '" onerror="this.style.display=\'none\'"/>' +
        '<span class="sug-id">' + item.id + '</span> ' + item.name;
    }
    div.addEventListener("mousedown", () => selectSuggestion(item));
    suggestionBox.appendChild(div);
  });

  suggestionBox.style.display = "block";
}

function handleSuggestKey(e) {
  const els = suggestionBox.querySelectorAll(".suggestion-item");
  if (!els.length) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeSuggest = (activeSuggest + 1) % els.length;
    updateActiveSuggest(els);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeSuggest = (activeSuggest - 1 + els.length) % els.length;
    updateActiveSuggest(els);
  } else if (e.key === "Enter" && activeSuggest >= 0) {
    e.preventDefault();
    els[activeSuggest].dispatchEvent(new Event("mousedown"));
  } else if (e.key === "Escape") {
    closeSuggestions();
  }
}

function updateActiveSuggest(els) {
  els.forEach((el, i) => el.classList.toggle("active", i === activeSuggest));
}

function selectSuggestion(item) {
  nameInput.value = item.name;
  idInput.value   = item.id;
  currentItem     = item;
  closeSuggestions();
  showImage(item);
  updateOutput();
}

function closeSuggestions() {
  suggestionBox.style.display = "none";
  suggestionBox.innerHTML = "";
  activeSuggest = -1;
}

// ── Find Item ────────────────────────────────────────────────────────────────
function findItem() {
  const nameVal = nameInput.value.trim().toLowerCase();
  const idVal   = idInput.value.trim();

  const found = items.find(item =>
    (nameVal && item.name === nameVal) ||
    (idVal   && item.id === idVal)
  );

  if (found) {
    if (document.activeElement === nameInput) idInput.value   = found.id;
    if (document.activeElement === idInput)   nameInput.value = found.name;
    currentItem = found;
    showImage(found);
    updateOutput();
  } else {
    currentItem = null;
    if (!nameVal && !idVal) resetState();
    else { hideImage(); setOutput("No item found...", false); }
  }
}

// ── Update Output ────────────────────────────────────────────────────────────
function updateOutput() {
  if (!currentItem) { setOutput("No item selected...", false); return; }
  const qty    = quantityInput.value.trim();
  const qtyNum = parseInt(qty, 10);
  const cond   = parseInt(conditionInput.value, 10);
  let text = '/item ' + currentItem.id;
  if (qty && !isNaN(qtyNum) && qtyNum > 0) text += ' ' + qtyNum;
  if (conditionInput.value !== "" && !isNaN(cond) && cond >= 0 && cond <= 4) text += ' ' + cond;
  setOutput(text, true);
}

// ── Validate Condition ───────────────────────────────────────────────────────
function validateCondition() {
  const val = parseInt(conditionInput.value, 10);
  if (conditionInput.value === "") { conditionError.textContent = ""; return true; }
  if (isNaN(val) || val < 0 || val > 4) {
    conditionError.textContent = "⚠ Must be 0–4 only!";
    return false;
  }
  conditionError.textContent = "";
  return true;
}

// ── Set Output ───────────────────────────────────────────────────────────────
function setOutput(text, hasValue) {
  output.textContent = text;
  output.classList.toggle("has-value", hasValue);
}

// ── Show / Hide Image ─────────────────────────────────────────────────────────
function showImage(item) {
  itemImage.src = item.image;
  itemImage.alt = item.name;
  itemImage.classList.add("visible");
  imagePlaceholder.style.display = "none";
  itemBadge.textContent = '✦ ' + item.name.toUpperCase() + ' ✦';
  itemBadge.classList.add("visible");
  starsRow.textContent = "";
}

function hideImage() {
  itemImage.src = "";
  itemImage.classList.remove("visible");
  imagePlaceholder.style.display = "flex";
  itemBadge.textContent = "";
  itemBadge.classList.remove("visible");
  starsRow.textContent = "";
}

// ── Copy ─────────────────────────────────────────────────────────────────────
function copyValue() {
  const text = output.textContent;
  if (!text || !output.classList.contains("has-value")) return;
  const doCopy = () => {
    clearTimeout(copyTimeout);
    copyLabel.textContent = "✅ Copied!";
    copyTimeout = setTimeout(() => { copyLabel.textContent = "📋 Copy"; }, 2000);
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(doCopy).catch(() => fallbackCopy(text, doCopy));
  } else { fallbackCopy(text, doCopy); }
}

function fallbackCopy(text, cb) {
  const el = document.createElement("textarea");
  el.value = text;
  Object.assign(el.style, { position: "fixed", opacity: "0" });
  document.body.appendChild(el);
  el.focus(); el.select();
  try { document.execCommand("copy"); cb(); } catch (e) { console.warn(e); }
  document.body.removeChild(el);
}

// ── Clear ─────────────────────────────────────────────────────────────────────
function clearAll() {
  nameInput.value = idInput.value = quantityInput.value = conditionInput.value = "";
  conditionError.textContent = "";
  clearTimeout(copyTimeout);
  copyLabel.textContent = "📋 Copy";
  currentItem = null;
  closeSuggestions();
  resetState();
}

function resetState() {
  hideImage();
  setOutput("No item selected...", false);
}

// ══════════════════════════════════════════════════════════════════════════════
// BROWSE ALL ITEMS — Visual grid selector
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

// ── Wire up filter inputs ─────────────────────────────────────────────────────
browseFilter.addEventListener('input',    scheduleBrowseRender);
browseCatFilter.addEventListener('change', scheduleBrowseRender);
browseQtyInput.addEventListener('input',   updateBrowseOutput);
browseCondInput.addEventListener('input',  () => { validateBrowseCond(); updateBrowseOutput(); });

// ── Called after items load — init grid ───────────────────────────────────────
let browseFiltered  = [];
let browseRendered  = 0;
const BROWSE_PAGE   = 40;

function initBrowseGrid() {
  browseCount.textContent = items.length + ' items';
  // Infinite scroll listener
  browseGrid.addEventListener('scroll', onBrowseScroll);
  scheduleBrowseRender();
}

function onBrowseScroll() {
  const el = browseGrid;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
    loadMoreBrowseCards();
  }
}

// Debounced render
function scheduleBrowseRender() {
  clearTimeout(browseRenderTO);
  browseRenderTO = setTimeout(renderBrowseGrid, 180);
}

// ── Render the grid ───────────────────────────────────────────────────────────
function renderBrowseGrid() {
  const filterVal = browseFilter.value.trim().toLowerCase();
  const catVal    = browseCatFilter.value;

  browseFiltered = items.filter(item => {
    if (catVal !== '' && !String(item.id).startsWith(catVal)) return false;
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

// ── Make a single card ────────────────────────────────────────────────────────
function makeBrowseCard(item) {
  const card = document.createElement('div');
  card.className = 'browse-card' + (browseCurrentItem && browseCurrentItem.id === item.id ? ' selected' : '');
  card.dataset.id = item.id;

  if (item.image) {
    const img = document.createElement('img');
    img.className = 'browse-card-img';
    img.src = item.image;
    img.alt = item.name;
    img.onerror = function() {
      this.replaceWith(makeFallbackIcon());
    };
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

// ── Select an item from the grid ──────────────────────────────────────────────
function selectBrowseItem(item, cardEl) {
  // Deselect previous
  browseGrid.querySelectorAll('.browse-card.selected').forEach(c => c.classList.remove('selected'));
  cardEl.classList.add('selected');

  browseCurrentItem = item;

  // Show selected bar
  browseSelImg.src = item.image || '';
  browseSelImg.alt = item.name;
  browseSelImg.style.display = item.image ? '' : 'none';
  browseSelName.textContent = item.name.toUpperCase();
  browseSelId.textContent   = '✦ ID: ' + item.id;

  browseSelectedBar.style.display  = 'flex';
  browseOutputWrap.style.display   = 'block';

  // Scroll selected card into view softly
  cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  updateBrowseOutput();
}

// ── Update output command ─────────────────────────────────────────────────────
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

// ── Copy browse output ────────────────────────────────────────────────────────
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

// ── Deselect ──────────────────────────────────────────────────────────────────
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

// ── Hook into loadItems ───────────────────────────────────────────────────────
// Patch loadItems to call initBrowseGrid after data is ready
const _origLoadItems = loadItems;
// We re-invoke after items are populated via a MutationObserver on placeholder text
// Simpler: poll until items.length > 0
(function waitForItems() {
  if (items.length > 0) {
    initBrowseGrid();
  } else {
    setTimeout(waitForItems, 300);
  }
})();
