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

// 참고: 과거 웹 PWA용 ServiceWorker 알림 시스템(initServiceWorker / syncRemindersToSW /
// saveScheduleForSW / requestNotificationPermission 등)은 제거되었다.
// 네이티브 앱에서는 src/services/localNotification.js 의 Capacitor LocalNotifications가
// 모든 복용 알림을 담당한다. (단일 소스)

export { DEFAULT_TIMES, SLOT_LABELS };
