// ═══════════════════════════════════════════
// Reminder Service - 복용 시간 관리 + 푸시 알림
// ═══════════════════════════════════════════

const REMINDER_KEY = 'medicheck_reminders';

// 기본 시간대별 시간
const DEFAULT_TIMES = {
  morning: '08:00',
  evening: '19:00',
  bedtime: '22:30',
};

// 시간대 라벨
const SLOT_LABELS = {
  morning: { emoji: '🌅', label: '아침', desc: '식사 후' },
  evening: { emoji: '🌙', label: '저녁', desc: '식사 후' },
  bedtime: { emoji: '😴', label: '취침 전', desc: '공복' },
};

/**
 * 저장된 리마인더 시간 로드
 */
export function loadReminders() {
  try {
    const saved = localStorage.getItem(REMINDER_KEY);
    if (saved) {
      return { ...DEFAULT_TIMES, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('리마인더 로드 실패:', e);
  }
  return { ...DEFAULT_TIMES };
}

/**
 * 특정 시간대의 리마인더 시간 저장 + SW에 전달
 */
export function saveReminderTime(slot, time) {
  const current = loadReminders();
  current[slot] = time;
  localStorage.setItem(REMINDER_KEY, JSON.stringify(current));
  // Service Worker에 업데이트 전달
  syncRemindersToSW();
}

/**
 * 전체 리마인더 정보 반환
 */
export function getReminderSchedule() {
  const times = loadReminders();
  return Object.entries(SLOT_LABELS).map(([slot, meta]) => ({
    slot,
    time: times[slot],
    ...meta,
  }));
}

/**
 * 오늘의 복용 스케줄 생성
 */
export function getTodaySchedule(timingResult) {
  if (!timingResult || !timingResult.schedule) return [];

  const times = loadReminders();
  const slotMap = { '아침': 'morning', '저녁': 'evening', '취침 전': 'bedtime' };

  return timingResult.schedule
    .map(s => {
      const slot = slotMap[s.label] || 'morning';
      const meta = SLOT_LABELS[slot];
      return {
        slot,
        time: times[slot],
        emoji: meta.emoji,
        label: meta.label,
        desc: meta.desc,
        supplements: s.supplements,
      };
    })
    .filter(s => s.supplements.length > 0)
    .sort((a, b) => a.time.localeCompare(b.time));
}

// ═══════════════════════════════════════════
// Service Worker + Push Notification
// ═══════════════════════════════════════════

let swRegistration = null;

/**
 * Service Worker 등록 + 알림 권한 요청
 */
export async function initServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Reminder] Service Worker 미지원 브라우저');
    return false;
  }

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js');
    console.log('[Reminder] Service Worker 등록 완료');

    // SW에서 메시지 수신 (복용 완료 처리)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'DOSE_CHECKED') {
        const { slot, todayKey } = event.data;
        _handleDoseFromSW(slot, todayKey);
      }
    });

    // 리마인더 데이터 동기화
    syncRemindersToSW();
    return true;
  } catch (err) {
    console.error('[Reminder] SW 등록 실패:', err);
    return false;
  }
}

/**
 * 알림 권한 요청
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const result = await Notification.requestPermission();
  return result;
}

/**
 * 현재 알림 권한 상태
 */
export function getNotificationStatus() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

/**
 * Service Worker에 리마인더 데이터 동기화
 */
export function syncRemindersToSW() {
  if (!navigator.serviceWorker?.controller) return;

  const notiEnabled = localStorage.getItem('medicheck_noti') === 'true';

  // timingResult에서 스케줄 데이터 추출
  let schedule = [];
  try {
    // state에서 직접 접근 불가하므로 별도 키로 저장/로드
    const saved = localStorage.getItem('medicheck_schedule');
    if (saved) schedule = JSON.parse(saved);
  } catch (e) { /* ignore */ }

  navigator.serviceWorker.controller.postMessage({
    type: 'UPDATE_REMINDERS',
    data: {
      reminders: loadReminders(),
      schedule,
      notiEnabled,
    }
  });
}

/**
 * 분석 결과의 스케줄을 localStorage에 저장 (SW와 공유용)
 */
export function saveScheduleForSW(timingResult) {
  if (!timingResult?.schedule) return;

  const slotMap = { '아침': 'morning', '저녁': 'evening', '취침 전': 'bedtime' };
  const schedule = timingResult.schedule.map(s => ({
    slot: slotMap[s.label] || 'morning',
    supplements: s.supplements.map(sup => ({
      name: sup.name,
      icon: sup.icon,
    })),
  }));

  localStorage.setItem('medicheck_schedule', JSON.stringify(schedule));
  syncRemindersToSW();
}

/**
 * SW에서 복용 완료 메시지 수신 시 처리
 */
function _handleDoseFromSW(slot, todayKey) {
  const key = 'medicheck_checked_' + todayKey;
  let checked = [];
  try {
    const saved = localStorage.getItem(key);
    if (saved) checked = JSON.parse(saved);
  } catch (e) { /* ignore */ }

  if (!checked.includes(slot)) {
    checked.push(slot);
    localStorage.setItem(key, JSON.stringify(checked));
    // 화면 갱신을 위해 커스텀 이벤트 발생
    window.dispatchEvent(new CustomEvent('dose-checked', { detail: { slot } }));
  }
}

export { DEFAULT_TIMES, SLOT_LABELS };
