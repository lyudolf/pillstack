// ═══════════════════════════════════════════
// Home Component - 내 영양제 선반
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
          <div>
            <h1>💊 MediCheck</h1>
            <p class="subtitle">내 영양제를 등록하고 분석해보세요</p>
          </div>
        </div>
      </div>
      <div class="page-content">
        ${isEmpty ? _renderEmpty() : _renderShelf(supplements)}
        ${!isEmpty && state.timingResult ? _renderTodaySchedule() : ''}
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

function _renderTodaySchedule() {
  const schedule = getTodaySchedule(state.timingResult);
  if (schedule.length === 0) return '';

  // 오늘 체크한 항목 로드
  const today = new Date().toISOString().slice(0, 10);
  let checkedSlots = [];
  try {
    const saved = localStorage.getItem('medicheck_checked_' + today);
    if (saved) checkedSlots = JSON.parse(saved);
  } catch (e) { /* ignore */ }

  return `
    <div class="schedule-card animate-in animate-in-delay-2" style="margin-top:20px;">
      <div class="schedule-card-title">
        <span>⏰</span> 오늘의 복용 스케줄
      </div>
      ${schedule.map(slot => {
        const isDone = checkedSlots.includes(slot.slot);
        return `
          <div class="schedule-row">
            <div>
              <div class="schedule-time">${slot.time}</div>
              <div class="schedule-slot-label">${slot.emoji} ${slot.label} · ${slot.desc}</div>
            </div>
            <div class="schedule-pills">
              ${slot.supplements.map(s => `
                <span class="schedule-mini-pill">${s.icon} ${s.name}</span>
              `).join('')}
            </div>
            <div class="schedule-check ${isDone ? 'done' : ''}"
                 onclick="window.app.toggleDoseCheck('${slot.slot}')"
                 title="복용 체크">
              ${isDone ? '✓' : ''}
            </div>
          </div>
        `;
      }).join('')}
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
