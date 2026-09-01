// ═══════════════════════════════════════════
// AdMob Service - 광고 수익화
// ═══════════════════════════════════════════

let admobModule = null;
let isAdMobReady = false;
let rewardedLoaded = false;

// AdMob 프로덕션 광고 ID (퍼블리셔 pub-3509783767575021)
const AD_IDS = {
  rewarded: 'ca-app-pub-3509783767575021/3892209787',
};

// 최초 무료 분석 횟수 (총 1회, 리셋 없음)
const FREE_TOTAL_LIMIT = 1;

/**
 * AdMob 초기화 (Capacitor 네이티브 환경에서만 동작)
 */
export async function initAdMob() {
  try {
    admobModule = await import('@capacitor-community/admob');
    const { AdMob } = admobModule;

    await AdMob.initialize({
      requestTrackingAuthorization: false,
    });

    isAdMobReady = true;
    console.log('[AdMob] 초기화 완료');

    // 리워드 광고 미리 로드
    await prepareRewardedAd();
  } catch (e) {
    // 웹 환경이거나 플러그인 미설치 시 무시
    console.warn('[AdMob] 초기화 건너뜀 (웹 환경):', e.message);
    isAdMobReady = false;
  }
}

/**
 * 리워드 광고 미리 로드
 */
async function prepareRewardedAd() {
  if (!isAdMobReady || !admobModule) return;
  try {
    const { AdMob } = admobModule;
    await AdMob.prepareRewardedAd({ adId: AD_IDS.rewarded });
    rewardedLoaded = true;
    console.log('[AdMob] 리워드 광고 로드됨');
  } catch (e) {
    console.warn('[AdMob] 리워드 로드 실패:', e.message);
    rewardedLoaded = false;
  }
}

/**
 * 리워드 광고 표시 → 보상 지급
 * @returns {Promise<boolean>} 리워드 획득 여부
 */
export async function showRewardedAd() {
  if (!isAdMobReady || !admobModule) {
    console.warn('[AdMob] 광고 사용 불가 — 무료 분석 제공');
    return true; // 웹 환경에서는 광고 없이 허용
  }

  if (!rewardedLoaded) {
    await prepareRewardedAd();
    // 광고가 끝내 로드되지 않으면(no-fill 등) 분석을 막지 않고 통과시킨다.
    // 신규 앱은 출시 초기 no-fill이 잦은데, 여기서 false를 반환하면
    // 무료 횟수를 소진한 사용자가 핵심 기능에서 영구 잠긴다.
    // 수익을 우선해 '광고 없으면 차단'으로 바꾸려면 아래를 return false 로 교체.
    if (!rewardedLoaded) {
      console.warn('[AdMob] 광고 로드 실패 — 분석 통과 (fail-open)');
      return true;
    }
  }

  try {
    const { AdMob } = admobModule;

    return new Promise((resolve) => {
      // 리워드 수신 리스너
      const rewardListener = AdMob.addListener('onRewardedAdReward', () => {
        resolve(true);
      });

      // 광고 닫힘 리스너 (리워드 없이 닫은 경우)
      const dismissListener = AdMob.addListener('onRewardedAdDismissed', () => {
        rewardListener.remove();
        dismissListener.remove();
        rewardedLoaded = false;
        prepareRewardedAd(); // 다음 광고 미리 로드
        resolve(false);
      });

      AdMob.showRewarded();
    });
  } catch (e) {
    console.error('[AdMob] 리워드 광고 표시 실패:', e);
    rewardedLoaded = false;
    return false;
  }
}

/**
 * 총 분석 횟수 확인 (리셋 없음)
 */
export function getTotalAnalysisCount() {
  return parseInt(localStorage.getItem('pillstack_analysis_total') || '0', 10);
}

/**
 * 분석 횟수 증가
 */
export function incrementAnalysisCount() {
  const count = getTotalAnalysisCount() + 1;
  localStorage.setItem('pillstack_analysis_total', String(count));
}

/**
 * 분석 가능 여부 확인
 * @returns {{ allowed: boolean, remaining: number, needAd: boolean }}
 */
export function checkAnalysisQuota() {
  const count = getTotalAnalysisCount();
  if (count < FREE_TOTAL_LIMIT) {
    return { allowed: true, remaining: FREE_TOTAL_LIMIT - count, needAd: false };
  }
  return { allowed: false, remaining: 0, needAd: true };
}

export { FREE_TOTAL_LIMIT, isAdMobReady };
