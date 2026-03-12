// ═══════════════════════════════════════════
// Home Component - 내 영양제 선반
// ═══════════════════════════════════════════

import { state, addSupplement, removeSupplement } from '../main.js';

export function renderHome() {
  const supplements = state.supplements;
  const isEmpty = supplements.length === 0;

  return `
    <div class="page active" id="page-home">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <h1>💊 MediCheck</h1>
            <p class="subtitle">내 영양제를 등록하고 분석해보세요</p>
          </div>
          <div class="api-indicator">
            <span class="dot ${state.apiConnected ? 'connected' : ''}"></span>
            ${state.apiConnected ? 'API 연결됨' : '로컬 DB'}
          </div>
        </div>
      </div>
      <div class="page-content">
        ${isEmpty ? _renderEmpty() : _renderShelf(supplements)}
      </div>
      ${supplements.length >= 2 ? _renderAnalyzeFAB(supplements.length) : ''}
    </div>
  `;
}

function _renderEmpty() {
  return `
    <div class="empty-state animate-in">
      <div class="empty-icon">🧴</div>
      <h2>영양제를 추가해보세요</h2>
      <p>복용 중인 영양제를 검색하거나 카메라로 촬영해서 추가하면, 성분 분석과 복용 시간을 추천해드려요.</p>
      <button class="btn-primary" onclick="window.app.navigate('search')">
        <span>🔍</span> 영양제 검색하기
      </button>
      <div style="margin-top:12px;">
        <button class="btn-secondary" onclick="window.app.navigate('camera')">
          <span>📷</span> 카메라로 촬영하기
        </button>
      </div>
    </div>
  `;
}

function _renderShelf(supplements) {
  return `
    <div class="section-title animate-in">
      <span class="section-icon">📦</span>
      내 영양제 선반 (${supplements.length}개)
    </div>
    <div class="supplement-grid">
      ${supplements.map((s, i) => `
        <div class="supplement-card animate-in animate-in-delay-${(i % 4) + 1}" data-id="${s.id}">
          <button class="remove-btn" onclick="event.stopPropagation(); window.app.removeSupplement('${s.id}')" title="삭제">✕</button>
          <div class="icon">${s.icon}</div>
          <div class="name">${s.name}</div>
          <div class="brand">${s.brand}</div>
        </div>
      `).join('')}
      <div class="add-card animate-in" onclick="window.app.navigate('search')">
        <div class="add-icon">+</div>
        <span>영양제 추가</span>
      </div>
    </div>
  `;
}

function _renderAnalyzeFAB(count) {
  return `
    <button class="analyze-fab" onclick="window.app.startAnalysis()">
      🔬 성분 분석하기
      <span class="fab-badge">${count}개 영양제</span>
    </button>
  `;
}
