// api/account/delete.js — 계정 탈퇴 요청 API
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: '인증 필요' });

  try {
    // 유저 토큰으로 클라이언트 생성 → 본인 확인
    const userClient = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return res.status(401).json({ error: '유효하지 않은 세션' });

    // admin 클라이언트로 탈퇴 큐 등록
    const admin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 이미 요청한 건 있는지 체크
    const { data: existing } = await admin
      .from('account_deletions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (existing) {
      return res.json({ message: '이미 탈퇴 요청이 접수되어 있습니다.', status: 'pending' });
    }

    // 7일 후 삭제 예약
    const { error: insertErr } = await admin
      .from('account_deletions')
      .insert({
        user_id: user.id,
        reason: req.body?.reason || null,
      });

    if (insertErr) throw insertErr;

    // 즉시 로그아웃 처리
    await admin.auth.admin.signOut(user.id);

    res.json({
      message: '탈퇴 요청이 접수되었습니다. 7일 후 모든 데이터가 삭제됩니다.',
      status: 'pending',
      deleteAfter: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    console.error('Account deletion error:', err);
    res.status(500).json({ error: err.message });
  }
}
