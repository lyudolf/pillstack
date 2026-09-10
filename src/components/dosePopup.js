// ═══════════════════════════════════════════
// Dose Popup — 복용 팝업
//
// 알림을 탭했을 때, 또는 슬롯 시각에 앱이 열려 있을 때 뜬다.
// 큰 글씨로 무엇을 먹을지 보여주고, 큰 버튼 하나로 끝낸다.
//
// 자동 브로드캐스트를 없앴기 때문에, "누가 먹었는지"라는 사회적 신호를
// 사용자에게 전달하는 곳이 바로 이 팝업이다. (기획서 9장)
// ═══════════════════════════════════════════

import { uiIcon } from '../utils/icons.js';
import { SLOT_LABEL } from '../services/group.js';

const SLOT_ICON = { morning: 'sun', evening: 'moon', bedtime: 'bed' };
let _open = false;

/**
 * @param {object} opts
 *   slot          'morning' | 'evening' | 'bedtime'
 *   supplements   [{ name }]
 *   alreadyTaken  [{ nickname, takenAt }]  이미 먹은 구성원 (사회적 신호)
 */
export function showDosePopup({ slot, supplements = [], alreadyTaken = [] }) {
  if (_open) return;
  _open = true;

  const label = SLOT_LABEL[slot] || '';
  const takenLine = alreadyTaken.length > 0
    ? `<p class="dp-social">${_names(alreadyTaken)} 먹었어요 ${uiIcon('check', 14)}</p>`
    : '';

  const html = `
    <div class="dose-popup-overlay" id="dose-popup" role="dialog" aria-modal="true" aria-label="${label} 복용">
      <div class="dose-popup slot-${slot}">
        <div class="dp-slot">
          <span class="dp-slot-icon">${uiIcon(SLOT_ICON[slot] || 'pill', 20)}</span>
          <span>${label} 영양제</span>
        </div>

        <ul class="dp-list">
          ${supplements.map(s => `<li>${_esc(s.name)}</li>`).join('')}
        </ul>

        ${takenLine}

        <button class="dp-take" id="dp-take">먹었어요</button>
        <button class="dp-later" id="dp-later">10분 뒤에</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);

  requestAnimationFrame(() => {
    document.getElementById('dose-popup')?.classList.add('active');
  });

  document.getElementById('dp-take')?.addEventListener('click', async () => {
    closeDosePopup();
    await window.app.takeDose(slot);
  });

  document.getElementById('dp-later')?.addEventListener('click', () => {
    closeDosePopup();
    window.app.showToast('10분 뒤에 다시 알려드릴게요', 'info');
  });
}

export function closeDosePopup() {
  const el = document.getElementById('dose-popup');
  if (!el) { _open = false; return; }
  el.classList.remove('active');
  setTimeout(() => { el.remove(); _open = false; }, 250);
}

export function isDosePopupOpen() {
  return _open;
}

/**
 * 전원 완료 축하 — 마지막에 먹은 사람에게만 보여준다.
 * 푸시는 보내지 않는다(기획서 9장). 이 자리가 유일한 표현이다.
 */
export function showCelebration(groups) {
  if (!groups || groups.length === 0) return;
  const g = groups[0];

  const html = `
    <div class="celebrate-overlay" id="celebrate">
      <div class="celebrate-card">
        <div class="celebrate-emoji">${_esc(g.groupEmoji || '🎉')}</div>
        <h2>다 같이 챙겼어요!</h2>
        <p><strong>${_esc(g.groupName)}</strong> ${g.memberCount}명 모두 완료</p>
        ${g.streak ? `<div class="celebrate-streak">🔥 ${g.streak}일째</div>` : ''}
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  requestAnimationFrame(() => document.getElementById('celebrate')?.classList.add('active'));

  setTimeout(() => {
    const el = document.getElementById('celebrate');
    if (!el) return;
    el.classList.remove('active');
    setTimeout(() => el.remove(), 300);
  }, 2200);
}

function _names(list) {
  const names = list.map(t => t.nickname);
  if (names.length === 1) return `${_esc(names[0])}는`;
  if (names.length === 2) return `${_esc(names[0])}·${_esc(names[1])}는`;
  return `${_esc(names[0])} 외 ${names.length - 1}명은`;
}

function _esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
