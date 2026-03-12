// ═══════════════════════════════════════════
// Search Component - 영양제 검색 & 추가
// ═══════════════════════════════════════════

import { SUPPLEMENTS, CATEGORIES } from '../data/fallbackDB.js';
import { publicDataAPI } from '../api/publicData.js';

let searchTimeout = null;
let currentCategory = 'all';
let apiResults = [];

export function renderSearch() {
  return `
    <div class="modal-overlay active" id="search-modal">
      <div class="modal">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <h2>영양제 검색</h2>
          <button class="modal-close" onclick="window.app.navigate('home')">✕</button>
        </div>
        <div class="modal-body">
          <div class="search-container">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              class="search-input"
              id="search-input"
              placeholder="영양제 이름 또는 브랜드 검색..."
              autocomplete="off"
              oninput="window.app.handleSearch(this.value)"
            />
          </div>
          <div class="category-filters" id="category-filters">
            ${Object.entries(CATEGORIES).map(([key, cat]) => `
              <button class="category-pill ${key === currentCategory ? 'active' : ''}"
                onclick="window.app.filterCategory('${key}')">
                ${cat.icon} ${cat.label}
              </button>
            `).join('')}
          </div>
          <div id="search-results" class="search-results">
            ${_renderResults('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function handleSearch(query) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    // API 검색 (있으면)
    if (publicDataAPI.isConfigured && query.length >= 2) {
      const results = await publicDataAPI.searchHealthFood(query);
      if (results && results.length > 0) {
        apiResults = results;
      }
    }

    const container = document.getElementById('search-results');
    if (container) {
      container.innerHTML = _renderResults(query);
    }
  }, 300);
}

export function filterCategory(category) {
  currentCategory = category;
  // Update pills
  document.querySelectorAll('.category-pill').forEach((pill) => {
    pill.classList.toggle('active', pill.textContent.trim().includes(CATEGORIES[category]?.label));
  });
  // Re-render results
  const input = document.getElementById('search-input');
  const query = input?.value || '';
  const container = document.getElementById('search-results');
  if (container) {
    container.innerHTML = _renderResults(query);
  }
}

function _renderResults(query) {
  const q = query.toLowerCase().trim();

  // Combine local + API results
  let results = [...SUPPLEMENTS];

  // Add API results that aren't duplicates
  for (const apiItem of apiResults) {
    const alreadyExists = results.some((s) => s.name === apiItem.name);
    if (!alreadyExists) {
      results.push(apiItem);
    }
  }

  // Filter by category
  if (currentCategory !== 'all') {
    results = results.filter((s) => s.category === currentCategory);
  }

  // Filter by search query
  if (q) {
    results = results.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.brand.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
    );
  }

  // Check which ones are already added
  const addedIds = new Set((window.app?.getState()?.supplements || []).map((s) => s.id));

  if (results.length === 0) {
    return `
      <div class="no-results">
        <div class="no-results-icon">🔍</div>
        <p>${q ? `"${q}"에 대한 검색 결과가 없습니다.` : '이 카테고리에 해당하는 영양제가 없습니다.'}</p>
      </div>
    `;
  }

  return results.map((s) => {
    const isAdded = addedIds.has(s.id);
    const categoryInfo = CATEGORIES[s.category] || CATEGORIES.vitamin;
    const isFromAPI = s.source === 'api';

    return `
      <div class="search-result-item ${isAdded ? 'added' : ''}"
           onclick="${isAdded ? '' : `window.app.addFromSearch('${s.id}')`}"
           style="${isAdded ? 'opacity:0.5;pointer-events:none;' : ''}">
        <div class="result-icon">${s.icon}</div>
        <div class="result-info">
          <div class="result-name">${s.name} ${isAdded ? '✅' : ''}</div>
          <div class="result-brand">${s.brand}${isFromAPI ? ' · 🌐 공공데이터' : ''}</div>
          <div class="result-tags">
            <span class="tag tag-${s.category}">${categoryInfo.icon} ${categoryInfo.label}</span>
            ${s.ingredients?.length ? `<span class="tag">성분 ${s.ingredients.length}종</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

export function getSupplementById(id) {
  // Check local DB first
  const local = SUPPLEMENTS.find((s) => s.id === id);
  if (local) return local;

  // Then check API results
  return apiResults.find((s) => s.id === id) || null;
}
