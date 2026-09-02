// api/_lib/fcm.js — FCM HTTP v1 발송 유틸
//
// 레거시 서버키 API는 종료됐으므로 v1 API + 서비스 계정 OAuth2 를 쓴다.
// google-auth-library 의존성 없이 node:crypto 로 JWT 를 직접 서명한다.
//
// 필요한 환경변수 (Vercel):
//   FIREBASE_PROJECT_ID    예: pillstack-d4fb7
//   FIREBASE_CLIENT_EMAIL  서비스 계정 이메일
//   FIREBASE_PRIVATE_KEY   서비스 계정 개인키 (PEM). 개행은 \n 로 이스케이프해 저장.
//
// 자격증명이 없으면 예외를 던지지 않고 { skipped: true } 를 반환한다.
// 알림 발송 실패가 복용 기록 같은 핵심 동작을 막아서는 안 되기 때문이다.

import crypto from 'node:crypto';

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

let cachedToken = null; // { value, expiresAt }

export function isFcmConfigured() {
  return !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Vercel 환경변수에는 개행을 \n 문자열로 저장하므로 복원한다.
  const privateKey = String(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, '\n');

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(privateKey, 'base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
  });

  if (!res.ok) {
    throw new Error(`FCM 토큰 발급 실패 (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }

  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

/**
 * 여러 기기 토큰에 같은 알림을 보낸다.
 * @param {string[]} tokens   대상 FCM 토큰
 * @param {object}   payload  { title, body, data }
 * @returns {Promise<{sent:number, invalidTokens:string[], skipped?:boolean}>}
 */
export async function sendPush(tokens, { title, body, data = {} }) {
  const targets = [...new Set((tokens || []).filter(Boolean))];
  if (targets.length === 0) return { sent: 0, invalidTokens: [] };

  if (!isFcmConfigured()) {
    console.warn('[FCM] 자격증명 미설정 — 발송 건너뜀:', title, '→', targets.length, '기기');
    return { sent: 0, invalidTokens: [], skipped: true };
  }

  const accessToken = await getAccessToken();
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  // data 값은 문자열만 허용된다.
  const stringData = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]));

  let sent = 0;
  const invalidTokens = [];

  // v1 API 는 배치 엔드포인트가 없어 토큰별로 보낸다. (그룹 최대 8명 규모라 충분)
  await Promise.all(targets.map(async (token) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            data: stringData,
            android: {
              priority: 'high',
              notification: {
                channel_id: 'pillstack-reminders',
                sound: 'default',
              },
            },
          },
        }),
      });

      if (res.ok) {
        sent++;
        return;
      }

      // 만료·해지된 토큰은 정리 대상으로 표시
      const errText = await res.text();
      if (res.status === 404 || res.status === 400 || /UNREGISTERED|INVALID_ARGUMENT/i.test(errText)) {
        invalidTokens.push(token);
      }
      console.warn(`[FCM] 발송 실패 (${res.status}):`, errText.slice(0, 160));
    } catch (err) {
      console.warn('[FCM] 발송 예외:', err.message);
    }
  }));

  return { sent, invalidTokens };
}

/**
 * 사용자들의 기기 토큰을 조회한다.
 * @param {object} admin  service_role Supabase 클라이언트
 * @param {string[]} userIds
 * @returns {Promise<Map<string, string[]>>} userId → tokens
 */
export async function getDeviceTokens(admin, userIds) {
  const map = new Map();
  if (!userIds || userIds.length === 0) return map;

  const { data, error } = await admin
    .from('device_tokens')
    .select('user_id, fcm_token')
    .in('user_id', userIds);

  if (error) {
    console.warn('[FCM] 토큰 조회 실패:', error.message);
    return map;
  }
  for (const row of data || []) {
    if (!map.has(row.user_id)) map.set(row.user_id, []);
    map.get(row.user_id).push(row.fcm_token);
  }
  return map;
}

/**
 * 무효 토큰 정리 — 발송 결과에서 수집한 것을 지운다.
 */
export async function pruneInvalidTokens(admin, tokens) {
  if (!tokens || tokens.length === 0) return;
  try {
    await admin.from('device_tokens').delete().in('fcm_token', tokens);
    console.log('[FCM] 무효 토큰 정리:', tokens.length);
  } catch (e) {
    console.warn('[FCM] 토큰 정리 실패:', e.message);
  }
}
