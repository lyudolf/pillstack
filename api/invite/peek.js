// api/invite/peek.js — 초대 코드 미리보기 (참여 전, 비로그인 상태에서 호출)
// 초대 링크 랜딩 페이지가 "어떤 그룹에 초대됐는지"를 보여주기 위해 사용한다.
// 그룹 이름·구성원 수·초대자 닉네임만 노출하며, 구성원 명단이나 복용 기록은 내려주지 않는다.
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const code = String(req.query.code || '').trim();
  if (!/^[0-9]{6}$/.test(code)) {
    return res.status(400).json({ error: '올바른 초대 코드가 아닙니다' });
  }

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase.rpc('peek_invite', { p_code: code });
    if (error) throw error;

    // 만료됐거나 없는 코드는 빈 배열
    if (!data || data.length === 0) {
      return res.status(404).json({ error: '만료되었거나 존재하지 않는 초대입니다' });
    }

    const g = data[0];
    res.json({
      groupName: g.group_name,
      groupEmoji: g.group_emoji,
      memberCount: g.member_count,
      inviterNickname: g.inviter_nickname,
    });
  } catch (err) {
    console.error('[invite/peek]', err.message);
    res.status(500).json({ error: '초대 정보를 불러오지 못했습니다' });
  }
}
