// ═══════════════════════════════════════════
// Group Service — 메인 화면 현황 · 복용 · 챙기기
//
// 알림 규칙(기획서 9장)의 판정은 전부 서버가 한다.
// 클라이언트는 결과를 표시하고, 버튼을 언제 보여줄지만 계산한다.
// ═══════════════════════════════════════════

import { supabase, getSession } from '../lib/supabase.js';
import { apiUrl } from '../utils/api.js';

export const SLOTS = ['morning', 'evening', 'bedtime'];
export const SLOT_LABEL = { morning: '아침', evening: '저녁', bedtime: '취침 전' };
const DEFAULT_TIMES = { morning: '08:00', evening: '19:00', bedtime: '22:30' };
const NUDGE_DELAY_MIN = 30;

// ─── 공통: 인증 요청 ───
async function authedPost(path, body) {
  const session = await getSession();
  if (!session?.access_token) throw new Error('로그인이 필요합니다');

  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || '요청에 실패했습니다');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** 오늘 날짜 (KST) */
export function todayKst() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * 지금 시각에 해당하는 슬롯을 고른다.
 * 각 슬롯 시각 이후 가장 가까운 것 → 아직 아무 슬롯도 시작 전이면 아침.
 */
export function currentSlot(reminderTimes = DEFAULT_TIMES) {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const nowMin = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const toMin = (t) => {
    const [h, m] = String(t).split(':').map(Number);
    return h * 60 + (m || 0);
  };
  let picked = 'morning';
  for (const slot of SLOTS) {
    if (nowMin >= toMin(reminderTimes[slot] || DEFAULT_TIMES[slot])) picked = slot;
  }
  return picked;
}

/**
 * 메인 화면 현황 — 내가 속한 모든 그룹 × 구성원 × 해당 슬롯 상태.
 * 서버 RPC 한 번으로 가져와 그룹별로 묶는다.
 */
export async function fetchHomeStatus(slot, date = todayKst()) {
  const { data, error } = await supabase.rpc('home_status', { p_date: date, p_slot: slot });
  if (error) throw new Error(error.message);

  const groups = new Map();
  for (const row of data || []) {
    if (!groups.has(row.group_id)) {
      groups.set(row.group_id, {
        groupId: row.group_id,
        name: row.group_name,
        emoji: row.group_emoji,
        members: [],
      });
    }
    groups.get(row.group_id).members.push({
      userId: row.user_id,
      nickname: row.nickname,
      avatar: row.avatar_emoji,
      isMe: row.is_me,
      takenAt: row.taken_at,
      taken: !!row.taken_at,
      nudgedBy: row.nudged_by,        // 챙긴 사람 닉네임 (없으면 null)
      nudgedByMe: row.nudged_by_me,
      hasSupplements: row.has_supplements,
    });
  }
  return [...groups.values()];
}

/**
 * 구성원 행에 [챙기기] 버튼을 보여줄지 판단한다.
 * 서버가 최종 검증하지만, 불가능한 버튼을 눌러 실패 토스트를 보게 하지 않기 위해 미리 거른다.
 *
 * 숨기는 경우:
 *   · 나 자신
 *   · 이미 먹음
 *   · 이 슬롯에 등록한 영양제가 없음
 *   · 이미 누군가 챙김 (선착순 — 두 번 찌르지 않는다)
 */
export function canNudge(member, slotTime) {
  if (member.isMe || member.taken || !member.hasSupplements) return { show: false };
  if (member.nudgedBy) return { show: false, reason: 'already', by: member.nudgedBy };

  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const nowMin = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const [h, m] = String(slotTime || '08:00').split(':').map(Number);
  const availableAt = h * 60 + (m || 0) + NUDGE_DELAY_MIN;

  if (nowMin < availableAt) {
    return { show: true, disabled: true, waitMinutes: availableAt - nowMin };
  }
  return { show: true, disabled: false };
}

/**
 * [먹었어요] — 기록만 남긴다. 알림은 발생하지 않는다.
 * @returns {Promise<{completedGroups: Array}>} 전원 완료된 그룹 (인앱 축하 연출용)
 */
export async function recordIntake(slot) {
  return authedPost('/api/intake', { slot });
}

/**
 * [챙기기] — 서버가 시간·중복·멤버십을 검증한 뒤 발송한다.
 */
export async function sendNudge(groupId, toUserId, slot) {
  return authedPost('/api/nudge', { groupId, toUserId, slot });
}

/** 내 알림 시각 (없으면 기본값) */
export async function fetchReminderTimes() {
  const { data, error } = await supabase.from('reminder_times').select('slot, time');
  if (error) return { ...DEFAULT_TIMES };
  const times = { ...DEFAULT_TIMES };
  for (const row of data || []) times[row.slot] = String(row.time).slice(0, 5);
  return times;
}

/** 알림 시각 저장 */
export async function saveReminderTime(userId, slot, time) {
  const { error } = await supabase
    .from('reminder_times')
    .upsert({ user_id: userId, slot, time }, { onConflict: 'user_id,slot' });
  if (error) throw new Error(error.message);
}
