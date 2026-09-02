// ═══════════════════════════════════════════
// Invite Service — 초대 코드 수집 · 미리보기 · 참여
//
// 코드가 들어오는 경로는 세 가지이고, 전부 여기로 모인다.
//   ① App Link      https://www.pillstack.kr/i/482917   (앱 설치돼 있을 때, 앱이 바로 열림)
//   ② Install Referrer  스토어 경유 설치 후 첫 실행 (referrer=invite%3D482917)
//   ③ 수동 입력      6자리 코드
//
// 수집된 코드는 "보류 중인 초대(pending)"로 저장해 두고,
// 로그인·닉네임 입력이 끝난 뒤 joinGroup() 으로 실제 참여시킨다.
// (앱 첫 실행 시점에는 아직 로그인 전일 수 있기 때문)
// ═══════════════════════════════════════════

import { supabase } from '../lib/supabase.js';

const PENDING_KEY = 'pillstack_pending_invite';
const REFERRER_CHECKED_KEY = 'pillstack_referrer_checked';

// 초대 링크 호스트.
// 주의: apex(pillstack.kr)는 www 로 301 리다이렉트되는데, Android App Links 검증은
//       리다이렉트를 따라가지 않는다. 반드시 직접 서빙되는 호스트를 써야 앱이 바로 열린다.
//       Vercel 도메인 설정에서 apex 를 기본으로 바꾸면 이 값을 pillstack.kr 로 바꿀 것.
export const INVITE_HOST = 'https://www.pillstack.kr';

export function buildInviteLink(code) {
  return `${INVITE_HOST}/i/${code}`;
}

// ─── 보류 중인 초대 ───
export function setPendingInvite(code) {
  if (!/^[0-9]{6}$/.test(String(code || ''))) return false;
  localStorage.setItem(PENDING_KEY, String(code));
  return true;
}

export function getPendingInvite() {
  const c = localStorage.getItem(PENDING_KEY);
  return /^[0-9]{6}$/.test(c || '') ? c : null;
}

export function clearPendingInvite() {
  localStorage.removeItem(PENDING_KEY);
}

/**
 * 임의의 URL에서 초대 코드를 뽑는다.
 * 지원 형태:
 *   https://www.pillstack.kr/i/482917
 *   https://pillstack.kr/i/482917?x=1
 *   kr.pillstack://invite?code=482917
 */
export function extractCodeFromUrl(url) {
  if (!url) return null;
  const path = url.match(/\/i\/(\d{6})/);
  if (path) return path[1];
  const query = url.match(/[?&]code=(\d{6})/);
  if (query) return query[1];
  return null;
}

/**
 * ① App Link / 커스텀 스킴으로 앱이 열렸을 때
 * main.js 의 appUrlOpen 리스너에서 호출한다.
 * @returns {string|null} 수집한 코드
 */
export function captureInviteFromUrl(url) {
  const code = extractCodeFromUrl(url);
  if (code) {
    setPendingInvite(code);
    console.log('[Invite] 링크에서 초대 코드 수집:', code);
  }
  return code;
}

/**
 * ② Install Referrer — 스토어를 거쳐 설치된 경우 첫 실행에서 1회만 조회한다.
 * Google 이 설치 직후 일정 기간만 값을 보장하므로 즉시 읽어 저장한다.
 * 이미 확인했거나(중복 방지) 웹 환경이면 조용히 넘어간다.
 */
export async function captureInviteFromReferrer() {
  if (localStorage.getItem(REFERRER_CHECKED_KEY) === '1') return null;

  try {
    const { InstallReferrer } = await import('@capawesome/capacitor-install-referrer');
    const result = await InstallReferrer.getInstallReferrer();
    localStorage.setItem(REFERRER_CHECKED_KEY, '1');

    // referrer 예: "invite=482917" (utm 파라미터가 함께 붙어올 수 있음)
    const raw = result?.installReferrer || '';
    const code = (raw.match(/(?:^|[&?])invite=(\d{6})/) || [])[1];
    if (code) {
      setPendingInvite(code);
      console.log('[Invite] Install Referrer에서 초대 코드 수집:', code);
      return code;
    }
  } catch (e) {
    // 웹 환경이거나 플러그인 미지원 — 정상 흐름
    localStorage.setItem(REFERRER_CHECKED_KEY, '1');
    console.warn('[Invite] Install Referrer 건너뜀:', e.message);
  }
  return null;
}

/**
 * 참여 전 미리보기 — "어떤 그룹인지" 확인용. 비로그인 상태에서도 호출 가능.
 */
export async function peekInvite(code) {
  const { data, error } = await supabase.rpc('peek_invite', { p_code: String(code) });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('만료되었거나 존재하지 않는 초대예요.');
  const g = data[0];
  return {
    groupId: g.group_id,
    groupName: g.group_name,
    groupEmoji: g.group_emoji,
    memberCount: g.member_count,
    inviterNickname: g.inviter_nickname,
  };
}

/**
 * ③ 실제 참여. 로그인 + 닉네임이 준비된 뒤 호출한다.
 * 승인 절차는 없다 — 유효한 코드가 곧 입장권.
 */
export async function joinGroup(code, nickname, avatar = '🙂') {
  const { data, error } = await supabase.rpc('join_group', {
    p_code: String(code),
    p_nickname: nickname,
    p_avatar: avatar,
  });
  if (error) throw new Error(error.message);
  clearPendingInvite();
  return data; // group_id
}

// ─── 그룹 생성 / 초대 발급 ───

export async function createGroup(name, emoji, nickname, avatar = '🙂') {
  const { data, error } = await supabase.rpc('create_group', {
    p_name: name,
    p_emoji: emoji,
    p_nickname: nickname,
    p_avatar: avatar,
  });
  if (error) throw new Error(error.message);
  return data; // group_id
}

export async function createInvite(groupId) {
  const { data, error } = await supabase.rpc('create_invite', { p_group_id: groupId });
  if (error) throw new Error(error.message);
  return { code: data, link: buildInviteLink(data) };
}

/**
 * 공유 시트 열기 (카카오톡 등). 실패하면 클립보드 복사로 폴백한다.
 */
export async function shareInvite(code, groupName) {
  const link = buildInviteLink(code);
  const text = `${groupName ? `'${groupName}'에서 ` : ''}같이 영양제 챙겨요 💊\n${link}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'PillStack 초대', text, url: link });
      return { method: 'share' };
    } catch (e) {
      if (e.name === 'AbortError') return { method: 'cancelled' };
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return { method: 'clipboard' };
  } catch {
    return { method: 'failed', text };
  }
}
