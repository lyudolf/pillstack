// 앱(native) 빌드 전용 스텁 — 'firebase/analytics' 자리를 채운다.
//
// @capacitor-firebase/analytics 는 웹 구현을 동적 import 로만 불러온다:
//   registerPlugin('FirebaseAnalytics', { web: () => import('./web')... })
// 네이티브에서는 Capacitor 브리지가 쓰이므로 이 웹 구현은 절대 실행되지 않는다.
// 다만 rollup 이 동적 import 도 정적 분석하기 때문에, 미설치 peer dep 인
// 'firebase/analytics' 를 해석하지 못해 빌드가 실패한다.
// 아래 스텁이 그 해석만 통과시켜 준다. (호출되면 명시적으로 실패시켜 오용을 막는다)
//
// 웹 빌드에서는 이 파일이 쓰이지 않는다 — 웹은 플러그인 전체를
// src/shims/firebase-analytics.js 로 대체한다. (vite.config.js 참고)

const never = (name) => () => {
  throw new Error(`[firebase-analytics stub] ${name}() 는 네이티브 빌드에서 호출될 수 없습니다.`);
};

export const getAnalytics = never('getAnalytics');
export const logEvent = never('logEvent');
export const setAnalyticsCollectionEnabled = never('setAnalyticsCollectionEnabled');
export const setConsent = never('setConsent');
export const setUserId = never('setUserId');
export const setUserProperties = never('setUserProperties');
