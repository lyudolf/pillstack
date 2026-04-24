// api/cron/cleanup.js — Vercel Cron: 탈퇴 + 휴면 자동 파기
import { createClient } from '@supabase/supabase-js';

export const config = { schedule: '0 0 * * *' }; // 매일 자정 UTC

export default async function handler(req, res) {
  // Vercel Cron 인증 (CRON_SECRET 검증)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const admin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const results = { deletedAccounts: 0, dormantAccounts: 0, errors: [] };

  // ─── 1. 탈퇴 요청 처리 (7일 경과) ───
  try {
    const { data: pendingDeletions } = await admin
      .from('account_deletions')
      .select('id, user_id')
      .eq('status', 'pending')
      .lte('delete_after', new Date().toISOString());

    for (const del of (pendingDeletions || [])) {
      try {
        // 유저 데이터 삭제
        await admin.from('user_supplements').delete().eq('user_id', del.user_id);
        await admin.from('analysis_results').delete().eq('user_id', del.user_id);

        // Auth 유저 삭제
        await admin.auth.admin.deleteUser(del.user_id);

        // 상태 업데이트
        await admin.from('account_deletions')
          .update({ status: 'completed' })
          .eq('id', del.id);

        results.deletedAccounts++;
      } catch (err) {
        results.errors.push(`Delete ${del.user_id}: ${err.message}`);
      }
    }
  } catch (err) {
    results.errors.push(`Deletion query: ${err.message}`);
  }

  // ─── 2. 휴면 계정 처리 (1년 미로그인) ───
  try {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

    // auth.users에서 1년 이상 미로그인 유저 조회
    const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({
      perPage: 100,
    });

    if (listErr) throw listErr;

    const dormantUsers = (users || []).filter(u => {
      const lastLogin = u.last_sign_in_at || u.created_at;
      return new Date(lastLogin) < new Date(oneYearAgo);
    });

    for (const user of dormantUsers) {
      try {
        // 이미 탈퇴 큐에 있는지 확인
        const { data: existing } = await admin
          .from('account_deletions')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (existing) continue; // 이미 처리 중

        // 유저 데이터 삭제
        await admin.from('user_supplements').delete().eq('user_id', user.id);
        await admin.from('analysis_results').delete().eq('user_id', user.id);

        // Auth 유저 삭제
        await admin.auth.admin.deleteUser(user.id);

        // 기록 남기기
        await admin.from('account_deletions').insert({
          user_id: user.id,
          reason: '휴면 계정 자동 파기 (1년 미로그인)',
          status: 'completed',
        });

        results.dormantAccounts++;
      } catch (err) {
        results.errors.push(`Dormant ${user.id}: ${err.message}`);
      }
    }
  } catch (err) {
    results.errors.push(`Dormant query: ${err.message}`);
  }

  console.log('Cleanup results:', JSON.stringify(results));
  res.json({ ok: true, ...results });
}
