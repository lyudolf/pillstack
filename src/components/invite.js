// ═══════════════════════════════════════════
// Invite — 초대하기 · 초대 참여 · 그룹 만들기
//
// 초대 1개 = 링크 + 6자리 코드 (같은 초대의 두 얼굴).
// 승인 절차는 없다. 유효한 코드가 곧 입장권이다. (기획서 11장)
// ═══════════════════════════════════════════

import { uiIcon } from '../utils/icons.js';
import { state } from '../main.js';

const EMOJIS = ['💑', '🏠', '👨‍👩‍👧', '🧑‍🤝‍🧑', '💪', '🌿', '🐣', '🍀'];

export function renderInvite() {
  const v = state.invite || {};
  if (v.mode === 'create') return _createGroup(v);
  if (v.mode === 'join') return _joinGroup(v);
  if (v.mode === 'share') return _share(v);
  return _pick();
}

// ─── 진입: 만들까 / 참여할까 ───
function _pick() {
  return _page('함께 챙기기', `
    <p class="inv-lead">같이 영양제를 챙길 그룹을 만들거나,<br>받은 초대로 참여하세요.</p>
    <div class="inv-actions">
      <button class="btn-take" onclick="window.app.inviteMode('create')">
        ${uiIcon('plus', 16)} 새 그룹 만들기
      </button>
      <button class="btn-ghost" onclick="window.app.inviteMode('join')">
        ${uiIcon('link', 16)} 초대 코드로 참여하기
      </button>
    </div>
  `);
}

// ─── 그룹 만들기 ───
function _createGroup(v) {
  const emoji = v.emoji || EMOJIS[0];
  return _page('새 그룹 만들기', `
    <label class="inv-label">그룹 이름</label>
    <input class="inv-input" id="inv-group-name" maxlength="20"
           placeholder="예: 자기랑, 우리집" value="${_esc(v.name || '')}"
           oninput="window.app.inviteField('name', this.value)" />

    <label class="inv-label">그룹 아이콘</label>
    <div class="emoji-picker">
      ${EMOJIS.map(e => `
        <button class="emoji-opt ${e === emoji ? 'active' : ''}"
                onclick="window.app.inviteField('emoji','${e}')">${e}</button>
      `).join('')}
    </div>

    <label class="inv-label">이 그룹에서 나는</label>
    <div class="inv-nick-row">
      <input class="inv-input" id="inv-nickname" maxlength="12"
             placeholder="예: 자기, 엄마, 민수" value="${_esc(v.nickname || '')}"
             oninput="window.app.inviteField('nickname', this.value)" />
      <span class="inv-nick-suffix">(으)로 불려요</span>
    </div>

    ${v.error ? `<p class="inv-error">${_esc(v.error)}</p>` : ''}

    <button class="btn-take" onclick="window.app.submitCreateGroup()" ${v.busy ? 'disabled' : ''}>
      ${v.busy ? '만드는 중…' : '그룹 만들기'}
    </button>
  `, 'invite');
}

// ─── 초대 참여 ───
function _joinGroup(v) {
  const preview = v.preview;
  return _page('초대 코드로 참여', `
    ${preview ? `
      <div class="inv-preview">
        <div class="inv-preview-emoji">${_esc(preview.groupEmoji)}</div>
        <p><strong>${_esc(preview.inviterNickname)}</strong>님이<br>
           <strong class="accent">${_esc(preview.groupName)}</strong>에 초대했어요</p>
        <span class="inv-preview-meta">현재 ${preview.memberCount}명 참여 중</span>
      </div>

      <label class="inv-label">이 그룹에서 나는</label>
      <div class="inv-nick-row">
        <input class="inv-input" id="inv-nickname" maxlength="12"
               placeholder="예: 자기, 아들" value="${_esc(v.nickname || '')}"
               oninput="window.app.inviteField('nickname', this.value)" />
        <span class="inv-nick-suffix">(으)로 불려요</span>
      </div>
      ${v.error ? `<p class="inv-error">${_esc(v.error)}</p>` : ''}
      <button class="btn-take" onclick="window.app.submitJoinGroup()" ${v.busy ? 'disabled' : ''}>
        ${v.busy ? '참여하는 중…' : '참여하기'}
      </button>
    ` : `
      <p class="inv-lead">받은 6자리 초대 코드를 입력하세요.</p>
      <input class="inv-code-input" id="inv-code" inputmode="numeric" maxlength="6"
             placeholder="000000" value="${_esc(v.code || '')}"
             oninput="window.app.inviteField('code', this.value.replace(/[^0-9]/g,''))" />
      ${v.error ? `<p class="inv-error">${_esc(v.error)}</p>` : ''}
      <button class="btn-take" onclick="window.app.checkInviteCode()" ${v.busy ? 'disabled' : ''}>
        ${v.busy ? '확인 중…' : '확인'}
      </button>
    `}
  `, 'invite');
}

// ─── 초대 공유 ───
function _share(v) {
  return _page('초대하기', `
    <div class="inv-preview">
      <div class="inv-preview-emoji">${_esc(v.groupEmoji || '💊')}</div>
      <p><strong class="accent">${_esc(v.groupName || '')}</strong>에<br>함께할 사람을 초대하세요</p>
    </div>

    <button class="btn-take" onclick="window.app.shareInviteLink()">
      ${uiIcon('link', 16)} 링크 보내기
    </button>

    <div class="inv-code-box">
      <span class="inv-code-label">직접 입력할 초대 코드</span>
      <div class="inv-code-value">${_spaced(v.code)}</div>
      <button class="btn-ghost-sm" onclick="window.app.copyInviteCode()">
        ${uiIcon('copy', 13)} 코드 복사
      </button>
    </div>

    <p class="inv-hint">초대 코드는 7일 뒤 만료돼요.</p>
  `, 'today');
}

function _page(title, body, backTo = 'today') {
  return `
    <div class="page active" id="page-invite">
      <div class="inv-header">
        <button class="inv-back" onclick="window.app.navigate('${backTo}')" aria-label="뒤로">‹</button>
        <h1>${_esc(title)}</h1>
      </div>
      <div class="page-content inv-content">${body}</div>
    </div>
  `;
}

function _spaced(code) {
  return String(code || '').split('').join(' ');
}

function _esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
