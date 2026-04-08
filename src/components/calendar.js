// ═══════════════════════════════════════════
// Calendar Component - 복용 달력
// 날짜별 복용 완료 여부 시각화
// ═══════════════════════════════════════════

import { state } from '../main.js';
import { getTodaySchedule } from '../services/reminder.js';

const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const DAY_NAMES = ['일','월','화','수','목','금','토'];

// 캘린더 상태 (현재 보고 있는 월)
let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth();

export function setCalendarMonth(year, month) {
  viewYear = year;
  viewMonth = month;
}

export function renderCalendar() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // 스트릭 계산
  const streak = _calcStreak(today);

  // 이번 달 통계
  const stats = _calcMonthStats(viewYear, viewMonth);

  return `
    <div class="page active" id="page-calendar">
      <div class="page-header">
        <h1>📅 복용 달력</h1>
        <p class="subtitle">매일의 복용 기록을 확인하세요</p>
      </div>
      <div class="page-content">

        <!-- 스트릭 카드 -->
        ${_renderStreakCard(streak)}

        <!-- 월 네비 -->
        <div class="cal-month-nav animate-in animate-in-delay-1">
          <button class="cal-nav-btn" onclick="window.app.calPrev()">‹</button>
          <span class="cal-month-label">${viewYear}년 ${MONTH_NAMES[viewMonth]}</span>
          <button class="cal-nav-btn" onclick="window.app.calNext()">›</button>
        </div>

        <!-- 달력 그리드 -->
        <div class="cal-grid animate-in animate-in-delay-2">
          ${_renderDayHeaders()}
          ${_renderDays(viewYear, viewMonth, todayStr)}
        </div>

        <!-- 월간 통계 -->
        ${_renderMonthStats(stats)}

        <!-- 범례 -->
        <div class="cal-legend animate-in animate-in-delay-3">
          <div class="cal-legend-item"><span class="cal-dot cal-dot-full"></span> 전체 복용</div>
          <div class="cal-legend-item"><span class="cal-dot cal-dot-partial"></span> 일부 복용</div>
          <div class="cal-legend-item"><span class="cal-dot cal-dot-none"></span> 미복용</div>
        </div>

        <div style="height:20px;"></div>
      </div>
    </div>
  `;
}

function _renderStreakCard(streak) {
  const emoji = streak >= 7 ? '🔥' : streak >= 3 ? '💪' : '🌱';
  const msg = streak >= 14 ? '대단해요! 꾸준한 복용 습관!' :
              streak >= 7 ? '일주일 연속! 좋은 습관이에요' :
              streak >= 3 ? '좋아요! 계속 이어가세요' :
              streak >= 1 ? '시작이 반이에요!' : '오늘부터 시작해볼까요?';

  return `
    <div class="streak-card animate-in">
      <div class="streak-number">${emoji} ${streak}일</div>
      <div class="streak-label">연속 복용</div>
      <div class="streak-msg">${msg}</div>
    </div>
  `;
}

function _renderDayHeaders() {
  return DAY_NAMES.map(d =>
    `<div class="cal-day-header ${d === '일' ? 'sunday' : d === '토' ? 'saturday' : ''}">${d}</div>`
  ).join('');
}

function _renderDays(year, month, todayStr) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let cells = '';

  // 빈 셀 (월 시작 전)
  for (let i = 0; i < firstDay; i++) {
    cells += '<div class="cal-day empty"></div>';
  }

  // 각 날짜 셀
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const isFuture = new Date(dateStr) > new Date(todayStr);
    const status = isFuture ? 'future' : _getDayStatus(dateStr);

    cells += `
      <div class="cal-day ${status} ${isToday ? 'today' : ''}" 
           ${!isFuture ? `onclick="window.app.calDayClick('${dateStr}')"` : ''}>
        <span class="cal-day-num">${d}</span>
        ${status === 'full' ? '<span class="cal-day-check">✓</span>' :
          status === 'partial' ? '<span class="cal-day-dot">●</span>' : ''}
      </div>
    `;
  }

  return cells;
}

function _renderMonthStats(stats) {
  const rate = stats.total > 0 ? Math.round((stats.full / stats.total) * 100) : 0;

  return `
    <div class="cal-stats animate-in animate-in-delay-3">
      <div class="cal-stat-item">
        <div class="cal-stat-value" style="color:var(--accent-green);">${stats.full}</div>
        <div class="cal-stat-label">완료</div>
      </div>
      <div class="cal-stat-item">
        <div class="cal-stat-value" style="color:var(--accent-yellow);">${stats.partial}</div>
        <div class="cal-stat-label">일부</div>
      </div>
      <div class="cal-stat-item">
        <div class="cal-stat-value" style="color:var(--text-muted);">${stats.missed}</div>
        <div class="cal-stat-label">미복용</div>
      </div>
      <div class="cal-stat-item">
        <div class="cal-stat-value" style="color:var(--accent-blue);">${rate}%</div>
        <div class="cal-stat-label">복용률</div>
      </div>
    </div>
  `;
}

/**
 * 특정 날짜의 복용 상태 반환
 * 'full' | 'partial' | 'none'
 */
function _getDayStatus(dateStr) {
  const key = 'medicheck_checked_' + dateStr;
  let checked = [];
  try {
    const saved = localStorage.getItem(key);
    if (saved) checked = JSON.parse(saved);
  } catch (e) { /* ignore */ }

  if (checked.length === 0) return 'none';

  // 전체 영양제 수와 비교
  const totalSupps = _getExpectedSupplementCount();
  if (totalSupps === 0) return checked.length > 0 ? 'full' : 'none';

  return checked.length >= totalSupps ? 'full' : 'partial';
}

/**
 * 복용해야 할 영양제 총 개수
 */
function _getExpectedSupplementCount() {
  const schedule = getTodaySchedule(state.timingResult);
  if (schedule.length === 0) return state.supplements.length;

  let count = 0;
  schedule.forEach(slot => { count += slot.supplements.length; });
  return count || state.supplements.length;
}

/**
 * 연속 복용일 계산 (오늘 포함, 과거로 소급)
 */
function _calcStreak(today) {
  let streak = 0;
  const d = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dateStr = d.toISOString().slice(0, 10);
    const status = _getDayStatus(dateStr);

    if (status === 'full' || status === 'partial') {
      streak++;
    } else {
      break;
    }

    d.setDate(d.getDate() - 1);
  }

  return streak;
}

/**
 * 해당 월의 통계 계산
 */
function _calcMonthStats(year, month) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let full = 0, partial = 0, missed = 0, total = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    // 미래 날짜는 제외
    if (new Date(dateStr) > today) break;

    total++;
    const status = _getDayStatus(dateStr);
    if (status === 'full') full++;
    else if (status === 'partial') partial++;
    else missed++;
  }

  return { full, partial, missed, total };
}

/**
 * 날짜 클릭 시 상세 정보 반환 (토스트로 표시)
 */
export function handleDayClick(dateStr) {
  const key = 'medicheck_checked_' + dateStr;
  let checked = [];
  try {
    const saved = localStorage.getItem(key);
    if (saved) checked = JSON.parse(saved);
  } catch (e) { /* ignore */ }

  const date = new Date(dateStr);
  const label = `${date.getMonth() + 1}/${date.getDate()}`;

  if (checked.length === 0) {
    return `${label}: 복용 기록 없음`;
  }

  return `${label}: ${checked.length}개 복용 완료 (${checked.join(', ')})`;
}
