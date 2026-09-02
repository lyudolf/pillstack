// api/intake.js — [먹었어요] 기록
//
// 기획서 9장: 복용은 **알림을 발생시키지 않는다**. 기록만 남기고 현황을 갱신한다.
// 대신 그룹별 '전원 완료' 여부를 계산해 돌려주면, 클라이언트가 인앱 축하 연출을 띄운다.
// (완료도 푸시하지 않는다 — 정보가 아니라 보상이므로)
import { requireUser, handleCors, sendError } from './_lib/auth.js';

function nowKst() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { user, admin } = await requireUser(req);
    const { slot } = req.body || {};

    if (!['morning', 'evening', 'bedtime'].includes(slot)) {
      return res.status(400).json({ error: '슬롯이 올바르지 않습니다' });
    }

    const today = nowKst().toISOString().slice(0, 10);

    // ─── 1. 복용 기록 (UNIQUE 제약이 중복을 막는다) ───
    const { error: insertErr } = await admin
      .from('intake_events')
      .insert({ user_id: user.id, date: today, slot });

    // 이미 기록돼 있어도 성공으로 취급한다 (같은 버튼 두 번 눌러도 자연스럽게)
    if (insertErr && insertErr.code !== '23505') throw insertErr;

    // ─── 2. 내가 속한 그룹들에서 '전원 완료'가 됐는지 판정 ───
    const { data: myGroups } = await admin
      .from('group_members')
      .select('group_id, groups(name, emoji)')
      .eq('user_id', user.id);

    const completed = [];

    for (const g of myGroups || []) {
      const groupId = g.group_id;

      // 그룹 구성원
      const { data: members } = await admin
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);
      const memberIds = (members || []).map(m => m.user_id);
      if (memberIds.length < 2) continue; // 혼자면 완료 개념 없음

      // 이 슬롯에 영양제를 등록한 사람만 대상 (없는 사람은 제외해야 완료가 성립한다)
      const { data: supps } = await admin
        .from('user_supplements')
        .select('user_id')
        .in('user_id', memberIds)
        .eq('slot', slot);

      const targetIds = [...new Set((supps || []).map(s => s.user_id))];
      if (targetIds.length < 2) continue;

      // 대상자들의 오늘 이 슬롯 복용 기록
      const { data: intakes } = await admin
        .from('intake_events')
        .select('user_id')
        .in('user_id', targetIds)
        .eq('date', today)
        .eq('slot', slot);

      const takenIds = new Set((intakes || []).map(i => i.user_id));
      const allTaken = targetIds.every(id => takenIds.has(id));

      if (allTaken) {
        completed.push({
          groupId,
          groupName: g.groups?.name,
          groupEmoji: g.groups?.emoji,
          memberCount: targetIds.length,
        });
      }
    }

    res.json({ ok: true, date: today, slot, completedGroups: completed });
  } catch (err) {
    sendError(res, err, '복용 기록에 실패했습니다');
  }
}
