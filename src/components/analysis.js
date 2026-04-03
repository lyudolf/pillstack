// ═══════════════════════════════════════════
// Analysis Component - 분석 결과 대시보드
// ═══════════════════════════════════════════

import { loadReminders } from '../services/reminder.js';

export function renderAnalysis(analysisResult, timingResult) {
  if (!analysisResult) {
    return `<div class="page active" id="page-analysis">
      <div class="page-content"><div class="empty-state"><p>분석 결과가 없습니다.</p></div></div>
    </div>`;
  }

  const { score, interactions, conflictCount, synergyCount, summary } = analysisResult;
  const scoreClass = score >= 80 ? 'good' : score >= 60 ? 'warn' : 'bad';

  return `
    <div class="page active" id="page-analysis">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h1>🔬 분석 결과</h1>
          <button class="modal-close" onclick="window.app.navigate('home')">✕</button>
        </div>
      </div>
      <div class="page-content">
        <!-- Score Circle -->
        <div class="analysis-header animate-in">
          <div class="score-circle ${scoreClass}">
            <span class="score-label">안전도</span>
            <span class="score-value">${score}</span>
            <span class="score-max">/ 100</span>
          </div>
          <p style="color:var(--text-secondary);font-size:0.85rem;margin-top:8px;">${summary}</p>
        </div>

        <!-- Stats -->
        <div style="display:flex;gap:8px;margin-bottom:20px;" class="animate-in animate-in-delay-1">
          <div class="card" style="flex:1;text-align:center;">
            <div style="font-size:1.5rem;">⚠️</div>
            <div style="font-size:1.2rem;font-weight:700;margin-top:4px;">${conflictCount}</div>
            <div style="font-size:0.7rem;color:var(--text-muted);">주의 사항</div>
          </div>
          <div class="card" style="flex:1;text-align:center;">
            <div style="font-size:1.5rem;">✅</div>
            <div style="font-size:1.2rem;font-weight:700;margin-top:4px;">${synergyCount}</div>
            <div style="font-size:0.7rem;color:var(--text-muted);">시너지 효과</div>
          </div>
          <div class="card" style="flex:1;text-align:center;">
            <div style="font-size:1.5rem;">💊</div>
            <div style="font-size:1.2rem;font-weight:700;margin-top:4px;">${window.app?.getState()?.supplements?.length || 0}</div>
            <div style="font-size:0.7rem;color:var(--text-muted);">등록 영양제</div>
          </div>
        </div>

        <!-- Interactions -->
        ${interactions.length > 0 ? `
          <div class="section-title animate-in animate-in-delay-2">
            <span class="section-icon">🔗</span>
            성분 상호작용
          </div>
          <div class="interaction-list">
            ${interactions.map((item, i) => _renderInteractionCard(item, i)).join('')}
          </div>
        ` : ''}

        <!-- Timing Recommendation -->
        ${timingResult ? `
          <div class="schedule-section animate-in animate-in-delay-3">
            <h3><span>⏰</span> 추천 복용 스케줄</h3>
            ${_renderTimeline(timingResult)}
            ${timingResult.notes?.length > 0 ? `
              <div style="margin-top:16px;">
                ${timingResult.notes.map((note) => `
                  <div class="card" style="margin-bottom:8px;font-size:0.8rem;color:var(--text-secondary);line-height:1.5;">
                    ${note}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div style="height:20px;"></div>
      </div>
    </div>
  `;
}

function _renderInteractionCard(item, index) {
  const typeClass = item.type === 'synergy' ? 'synergy' : (item.severity === 'warning' ? 'danger' : 'caution');
  const badge = item.type === 'synergy' ? '✅' : (item.severity === 'warning' ? '🔴' : '🟡');

  return `
    <div class="interaction-card ${typeClass} animate-in" style="animation-delay:${0.1 * index}s; opacity:0;">
      <div class="interaction-header">
        <div class="interaction-badge">${badge}</div>
        <div>
          <div class="interaction-title">${item.title}</div>
          <div class="interaction-subtitle">
            ${item.sourceA || ''} ${item.sourceA && item.sourceB ? '↔' : ''} ${item.sourceB || ''}
          </div>
        </div>
      </div>
      <div class="interaction-body">${item.description}</div>
      ${item.tip ? `
        <div class="interaction-tip">
          <span class="tip-icon">💡</span>
          <span>${item.tip}</span>
        </div>
      ` : ''}
      ${item.fromAPI ? `
        <div style="margin-top:8px;">
          <span class="tag" style="background:rgba(59,130,246,0.15);color:var(--accent-blue);border-color:rgba(59,130,246,0.3);">🌐 공공데이터 DUR</span>
        </div>
      ` : ''}
    </div>
  `;
}

function _renderTimeline(timing) {
  if (!timing.schedule || timing.schedule.length === 0) return '';

  const reminders = loadReminders();
  const slotMap = { '아침': 'morning', '저녁': 'evening', '취침 전': 'bedtime' };

  return `
    <div class="timeline">
      ${timing.schedule.map((slot) => {
        const slotKey = slotMap[slot.label] || 'morning';
        const savedTime = reminders[slotKey] || '08:00';
        return `
        <div class="timeline-item">
          <div class="time-label-row">
            <div class="time-label">${slot.time}</div>
            <div class="time-picker-wrap">
              <input type="time" class="time-picker-input"
                     value="${savedTime}"
                     data-slot="${slotKey}"
                     onchange="window.app.setReminderTime('${slotKey}', this.value)"
                     title="${slot.label} 복용 시간 설정">
            </div>
          </div>
          <div class="time-supplements">
            ${slot.supplements.length > 0 ? slot.supplements.map((s) => `
              <div class="time-pill">
                <span class="pill-icon">${s.icon}</span>
                <span>${s.name}</span>
                ${s.withFood ? '<span style="font-size:0.65rem;color:var(--text-muted);">🍽️식후</span>' : '<span style="font-size:0.65rem;color:var(--text-muted);">공복</span>'}
              </div>
            `).join('') : '<span style="font-size:0.8rem;color:var(--text-muted);">해당 없음</span>'}
          </div>
        </div>
      `;}).join('')}
    </div>
    <div class="reminder-save-hint animate-in">
      <span>⏰</span> 시간을 설정하면 복용 알림에 반영됩니다
    </div>
  `;
}
