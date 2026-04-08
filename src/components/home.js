// ═══════════════════════════════════════════
// Home Component - 메인 화면
// [검색바] → [오늘의 복용 스케줄] → [내 영양제 선반]
// ═══════════════════════════════════════════

import { state, addSupplement, removeSupplement } from '../main.js';
import { getTodaySchedule } from '../services/reminder.js';

export function renderHome() {
  const supplements = state.supplements;
  const isEmpty = supplements.length === 0;

  return `
    <div class="page active" id="page-home">
      <div class="page-header">
        <div>
          <h1>💊 PillStack</h1>
          <p class="subtitle">스마트 영양제 복용 관리</p>
        </div>
      </div>
      <div class="page-content">
        ${_renderSearchBar()}
        ${isEmpty ? _renderEmpty() : _renderMainContent(supplements)}
      </div>
      ${supplements.length >= 2 ? _renderAnalyzeFAB(supplements.length) : ''}
    </div>
  `;
}

function _renderSearchBar() {
  return `
    <div class="home-search-bar animate-in" onclick="window.app.navigate('search')">
      <span class="home-search-icon">🔍</span>
      <span class="home-search-placeholder">영양제 이름으로 검색</span>
    </div>
  `;
}

function _renderEmpty() {
  return `
    <div class="empty-state animate-in">
      <div class="empty-icon">🦴</div>
      <h2>영양제를 추가해보세요</h2>
      <p>복용 중인 영양제를 검색하거나 라벨 이미지로 인식하면, 성분 분석과 복용 시간을 추천해드려요.</p>
      <button class="btn-primary" onclick="window.app.navigate('search')">
        <span>🔍</span> 영양제 검색하기
      </button>
      <div style="margin-top:12px;">
        <button class="btn-secondary" onclick="window.app.navigate('camera')">
          <span>🏷️</span> 이미지로 인식하기
        </button>
      </div>
    </div>
  `;
}

function _renderMainContent(supplements) {
  return `
    ${_renderTodaySchedule()}
    ${_renderShelf(supplements)}
  `;
}

function _renderTodaySchedule() {
  const schedule = getTodaySchedule(state.timingResult);
  if (schedule.length === 0) return '';

  const today = new Date().toISOString().slice(0, 10);
  let checkedItems = [];
  try {
    const saved = localStorage.getItem('medicheck_checked_' + today);
    if (saved) checkedItems = JSON.parse(saved);
  } catch (e) { /* ignore */ }

  return `
    <div class="schedule-card animate-in animate-in-delay-1" style="margin-bottom:20px;">
      <div class="schedule-card-title">
        <span>⏰</span> 오늘의 복용 스케줄
      </div>
      ${schedule.map(slot => `
        <div class="schedule-slot-header">
          <span class="schedule-slot-time">${slot.time}</span>
          <span class="schedule-slot-meta">${slot.emoji} ${slot.label} · ${slot.desc}</span>
        </div>
        ${slot.supplements.map(s => {
          const isDone = checkedItems.includes(s.id || s.name);
          return `
            <div class="schedule-item ${isDone ? 'done' : ''}">
              <div class="schedule-item-info">
                <span class="schedule-item-icon">${s.icon}</span>
                <span class="schedule-item-name">${s.name}</span>
              </div>
              <button class="dose-check-btn ${isDone ? 'checked' : ''}"
                      onclick="window.app.toggleDoseCheck('${s.id || s.name}')">
                ${isDone ? '✓ 완료' : '먹었어요'}
              </button>
            </div>
          `;
        }).join('')}
      `).join('')}
    </div>
  `;
}

function _renderShelf(supplements) {
  return `
    <div class="section-title animate-in animate-in-delay-2">
      <span class="section-icon">📦</span>
      내 영양제 선반 (${supplements.length}개)
    </div>
    <div class="supplement-grid">
      ${supplements.map((s, i) => `
        <div class="supplement-card animate-in animate-in-delay-${(i % 4) + 1}" data-id="${s.id}"
             onclick="window.app.showShelfDetail('${s.id}')" style="cursor:pointer;">
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
