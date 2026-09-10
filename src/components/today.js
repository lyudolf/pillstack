// ═══════════════════════════════════════════
// Today — 메인 화면 (v2)
//
// 화면 요소는 넷뿐이다.
//   ① 지금 슬롯 카드 + [먹었어요]
//   ② 그룹별 구성원 현황 + [챙기기]
//   ③ 그룹 연속 기록
//   ④ 하단 진입점 (내 영양제 / 기록)
//
// 그룹이 없으면 화면 전체가 "함께할 사람 초대하기"가 된다.
// 이 앱은 둘 이상을 전제로 하며, 그 사실을 숨기지 않는다.
// ═══════════════════════════════════════════

import { state } from '../main.js';
import { uiIcon } from '../utils/icons.js';
import { SLOT_LABEL, canNudge } from '../services/group.js';

const SLOT_ICON = { morning: 'sun', evening: 'moon', bedtime: 'bed' };

export function renderToday() {
  const { slot, groups, mySupplements, reminderTimes, loading } = state.today;

  if (loading) return _skeleton();

  return `
    <div class="page active" id="page-today">
      ${_header()}
      <div class="page-content today-content">
        ${_slotCard(slot, mySupplements, reminderTimes)}
        ${groups.length === 0 ? _emptyGroups() : groups.map(g => _groupSection(g, slot, reminderTimes)).join('')}
        ${_footerLinks()}
      </div>
    </div>
  `;
}

// ─── 헤더: 날짜 + 설정 ───
function _header() {
  const now = new Date();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `
    <div class="today-header">
      <div class="today-date">
        ${now.getMonth() + 1}월 ${now.getDate()}일 ${weekdays[now.getDay()]}요일
      </div>
      <button class="today-settings-btn" onclick="window.app.navigate('settings')" aria-label="설정">
        ${uiIcon('settings', 20)}
      </button>
    </div>
  `;
}

// ─── ① 지금 슬롯 카드 ───
function _slotCard(slot, supplements, times) {
  const label = SLOT_LABEL[slot];
  const time = times?.[slot] || '';
  const me = _findMe(slot);
  const taken = me?.taken;

  // 이 슬롯에 등록한 영양제가 없으면 설정을 유도한다
  if (!supplements || supplements.length === 0) {
    return `
      <section class="slot-card slot-${slot} slot-card-empty">
        <div class="slot-card-head">
          <span class="slot-card-icon">${uiIcon(SLOT_ICON[slot], 18)}</span>
          <span class="slot-card-label">${label}</span>
          ${time ? `<span class="slot-card-time">${time}</span>` : ''}
        </div>
        <p class="slot-empty-msg">${label}에 챙길 영양제가 아직 없어요.</p>
        <button class="btn-ghost-sm" onclick="window.app.navigate('mystack')">
          ${uiIcon('pill', 14)} 영양제 추가하기
        </button>
      </section>
    `;
  }

  return `
    <section class="slot-card slot-${slot} ${taken ? 'is-taken' : ''}">
      <div class="slot-card-head">
        <span class="slot-card-icon">${uiIcon(SLOT_ICON[slot], 18)}</span>
        <span class="slot-card-label">${label}</span>
        ${time ? `<span class="slot-card-time">${time}</span>` : ''}
      </div>

      <div class="slot-supplements">
        ${supplements.map(s => `<span class="slot-supp">${_esc(s.name)}</span>`).join('<span class="slot-dot">·</span>')}
      </div>

      ${taken ? `
        <div class="slot-done">
          <span class="slot-done-icon">${uiIcon('check', 20)}</span>
          <span>오늘 ${label} 완료</span>
        </div>
      ` : `
        <button class="btn-take" onclick="window.app.takeDose('${slot}')">
          먹었어요
        </button>
      `}
    </section>
  `;
}

// ─── ② 그룹 섹션 ───
function _groupSection(group, slot, times) {
  const members = group.members.filter(m => m.hasSupplements || m.isMe);

  return `
    <section class="group-section">
      <div class="group-head">
        <span class="group-emoji">${_esc(group.emoji)}</span>
        <span class="group-name">${_esc(group.name)}</span>
        ${group.streak > 0 ? `<span class="group-streak">🔥 ${group.streak}일째</span>` : ''}
        <button class="group-more" onclick="window.app.openGroup('${group.groupId}')" aria-label="그룹 관리">
          ${uiIcon('arrow', 14)}
        </button>
      </div>

      <ul class="member-list">
        ${members.map(m => _memberRow(m, group, slot, times)).join('')}
      </ul>
    </section>
  `;
}

function _memberRow(m, group, slot, times) {
  const nudge = canNudge(m, times?.[slot]);

  let status;
  if (m.taken) {
    status = `<span class="member-status taken">${_time(m.takenAt)} 먹음 ${uiIcon('check', 14)}</span>`;
  } else if (!m.hasSupplements) {
    status = `<span class="member-status none">이 시간 없음</span>`;
  } else if (m.nudgedBy) {
    status = `<span class="member-status nudged">${_esc(m.nudgedBy)}가 챙겨줬어요</span>`;
  } else if (nudge.show && nudge.disabled) {
    status = `<span class="member-status waiting">${nudge.waitMinutes}분 후 챙길 수 있어요</span>`;
  } else if (nudge.show) {
    status = `<button class="btn-nudge" onclick="window.app.nudge('${group.groupId}','${m.userId}','${slot}')">챙기기</button>`;
  } else {
    status = `<span class="member-status">아직</span>`;
  }

  return `
    <li class="member-row ${m.isMe ? 'is-me' : ''} ${m.taken ? 'is-taken' : ''}">
      <span class="member-avatar">${_esc(m.avatar)}</span>
      <span class="member-name">${_esc(m.nickname)}${m.isMe ? ' <em>(나)</em>' : ''}</span>
      ${status}
    </li>
  `;
}

// ─── 그룹 없음 ───
function _emptyGroups() {
  return `
    <section class="empty-groups">
      <div class="empty-groups-art">${uiIcon('users', 40)}</div>
      <h2>아직 혼자예요</h2>
      <p>같이 챙길 사람을 초대하면<br>서로 먹었는지 알려줄 수 있어요.</p>
      <button class="btn-take" onclick="window.app.navigate('invite')">
        함께할 사람 초대하기
      </button>
    </section>
  `;
}

function _footerLinks() {
  return `
    <nav class="today-footer">
      <button onclick="window.app.navigate('mystack')">${uiIcon('pill', 15)} 내 영양제</button>
      <span class="today-footer-sep">·</span>
      <button onclick="window.app.navigate('calendar')">${uiIcon('calendar', 15)} 기록</button>
    </nav>
  `;
}

function _skeleton() {
  return `
    <div class="page active" id="page-today">
      <div class="page-content today-content">
        <div class="sk sk-line" style="width:40%"></div>
        <div class="sk sk-card"></div>
        <div class="sk sk-line" style="width:30%"></div>
        <div class="sk sk-row"></div>
        <div class="sk sk-row"></div>
      </div>
    </div>
  `;
}

// ─── helpers ───
function _findMe(slot) {
  for (const g of state.today.groups || []) {
    const me = g.members.find(m => m.isMe);
    if (me) return me;
  }
  // 그룹이 없으면 로컬 복용 기록으로 판단
  return state.today.myIntake ? { taken: true } : null;
}

function _time(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`;
}

function _esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
