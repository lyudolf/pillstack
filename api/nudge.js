// api/nudge.js — [챙기기] 발송
//
// 기획서 9장 규칙을 서버에서 강제한다. 클라이언트 UI만으로는 부족하다
// (시간 조작·직접 API 호출이 가능하므로).
//
//   · 같은 그룹 구성원에게만 보낼 수 있다
//   · 받는 사람이 이미 그 슬롯을 먹었으면 보낼 수 없다
//   · 받는 사람의 슬롯 시각 + 30분 이후에만 가능        ← 구성원마다 시각이 다르므로 '받는 사람' 기준
//   · 받는 사람 야간(22:00~07:00)이면 보류               ← 발송만 미루고 기록은 남긴다
//   · 받는 사람 기준 하루 슬롯당 1건 (DB UNIQUE 제약이 선착순 잠금 역할)
import { requireUser, handleCors, sendError } from './_lib/auth.js';
import { sendPush, getDeviceTokens, pruneInvalidTokens } from './_lib/fcm.js';

const NUDGE_DELAY_MIN = 30;
const NIGHT_START = 22; // 22:00 ~
const NIGHT_END = 7;    // ~ 07:00
const DEFAULT_TIMES = { morning: '08:00', evening: '19:00', bedtime: '22:30' };
const SLOT_LABEL = { morning: '아침', evening: '저녁', bedtime: '취침 전' };

// 한국 시간 기준 (Vercel 서버는 UTC)
function nowKst() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function minutesOf(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { user, admin } = await requireUser(req);
    const { groupId, toUserId, slot } = req.body || {};

    if (!groupId || !toUserId || !['morning', 'evening', 'bedtime'].includes(slot)) {
      return res.status(400).json({ error: '요청 값이 올바르지 않습니다' });
    }
    if (toUserId === user.id) {
      return res.status(400).json({ error: '자기 자신은 챙길 수 없습니다' });
    }

    // ─── 1. 둘 다 해당 그룹의 구성원인가 ───
    const { data: members, error: memberErr } = await admin
      .from('group_members')
      .select('user_id, nickname')
      .eq('group_id', groupId)
      .in('user_id', [user.id, toUserId]);

    if (memberErr) throw memberErr;
    if (!members || members.length !== 2) {
      return res.status(403).json({ error: '같은 그룹의 구성원이 아닙니다' });
    }
    const fromNickname = members.find(m => m.user_id === user.id)?.nickname || '누군가';
    const toNickname = members.find(m => m.user_id === toUserId)?.nickname || '';

    const kst = nowKst();
    const today = kst.toISOString().slice(0, 10);

    // ─── 2. 이미 먹었으면 챙길 필요 없음 ───
    const { data: taken } = await admin
      .from('intake_events')
      .select('id')
      .eq('user_id', toUserId)
      .eq('date', today)
      .eq('slot', slot)
      .maybeSingle();

    if (taken) {
      return res.status(409).json({ error: '이미 복용을 완료했어요' });
    }

    // ─── 3. 받는 사람의 슬롯 시각 + 30분 이후인가 ───
    const { data: rt } = await admin
      .from('reminder_times')
      .select('time')
      .eq('user_id', toUserId)
      .eq('slot', slot)
      .maybeSingle();

    const slotTime = rt?.time?.slice(0, 5) || DEFAULT_TIMES[slot];
    const nowMin = kst.getUTCHours() * 60 + kst.getUTCMinutes();
    const availableAt = minutesOf(slotTime) + NUDGE_DELAY_MIN;

    if (nowMin < availableAt) {
      const wait = availableAt - nowMin;
      return res.status(425).json({
        error: `아직 챙길 수 없어요. ${wait}분 뒤에 가능해요`,
        availableInMinutes: wait,
      });
    }

    // ─── 4. 기록 (UNIQUE(to_user,date,slot) 이 선착순 잠금) ───
    const { error: insertErr } = await admin
      .from('nudges')
      .insert({ group_id: groupId, from_user: user.id, to_user: toUserId, date: today, slot });

    if (insertErr) {
      if (insertErr.code === '23505') {
        return res.status(409).json({ error: '이미 다른 분이 챙겼어요' });
      }
      throw insertErr;
    }

    // ─── 5. 야간이면 발송 보류 (기록은 남음) ───
    const hour = kst.getUTCHours();
    const isNight = hour >= NIGHT_START || hour < NIGHT_END;
    if (isNight) {
      return res.json({ ok: true, delivered: false, reason: 'night', nickname: fromNickname });
    }

    // ─── 6. 발송 ───
    const tokenMap = await getDeviceTokens(admin, [toUserId]);
    const tokens = tokenMap.get(toUserId) || [];

    const result = await sendPush(tokens, {
      title: `${SLOT_LABEL[slot]} 영양제 챙기세요 💊`,
      body: `${fromNickname}님이 챙겨줬어요`,
      data: { type: 'nudge', slot, groupId, fromNickname },
    });

    if (result.invalidTokens?.length) {
      await pruneInvalidTokens(admin, result.invalidTokens);
    }

    res.json({
      ok: true,
      delivered: result.sent > 0,
      skipped: result.skipped === true,
      nickname: fromNickname,
      toNickname,
    });
  } catch (err) {
    sendError(res, err, '챙기기에 실패했습니다');
  }
}
