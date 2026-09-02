// api/_lib/auth.js — 요청 인증 공통 유틸
import { createClient } from '@supabase/supabase-js';

/**
 * Authorization: Bearer <access_token> 을 검증하고 사용자와 클라이언트를 반환한다.
 * @returns {Promise<{user, userClient, admin}>}
 * @throws  인증 실패 시 { status, message } 를 가진 Error
 */
export async function requireUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    const e = new Error('인증이 필요합니다');
    e.status = 401;
    throw e;
  }

  const userClient = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) {
    const e = new Error('유효하지 않은 세션입니다');
    e.status = 401;
    throw e;
  }

  // RLS 를 우회해야 하는 작업(다른 사용자에게 알림 발송 등)용
  const admin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  return { user, userClient, admin };
}

/** 공통 CORS/프리플라이트 처리. 처리를 끝냈으면 true 반환. */
export function handleCors(req, res, methods = 'POST, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

/** 에러를 상태코드와 함께 응답으로 변환 */
export function sendError(res, err, fallbackMessage = '요청을 처리하지 못했습니다') {
  const status = err?.status || 500;
  if (status >= 500) console.error('[api]', err?.message, err?.stack);
  res.status(status).json({ error: err?.message || fallbackMessage });
}
