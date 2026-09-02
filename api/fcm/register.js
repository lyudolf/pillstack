// api/fcm/register.js — FCM 기기 토큰 등록
//
// 주의: 클라이언트(src/services/fcm.js)는 예전부터 이 엔드포인트를 호출해 왔지만
//       실제 파일이 없어 토큰이 한 번도 저장되지 않았다. → 푸시가 동작할 수 없었음.
//       v2에서 푸시가 핵심이 되므로 여기서 복구한다.
import { requireUser, handleCors, sendError } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { user, admin } = await requireUser(req);
    const { token, platform = 'android' } = req.body || {};

    if (!token || typeof token !== 'string' || token.length < 20) {
      return res.status(400).json({ error: '유효한 토큰이 아닙니다' });
    }

    // 같은 기기에서 토큰이 갱신되면 updated_at 만 바뀐다.
    const { error } = await admin
      .from('device_tokens')
      .upsert(
        { user_id: user.id, fcm_token: token, platform, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,fcm_token' }
      );

    if (error) throw error;

    res.json({ ok: true });
  } catch (err) {
    sendError(res, err, '토큰 등록에 실패했습니다');
  }
}
