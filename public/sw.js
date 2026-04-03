// ═══════════════════════════════════════════
// MediCheck Service Worker
// 복용 알림 푸시 & 오프라인 캐시
// ═══════════════════════════════════════════

const CACHE_NAME = 'medicheck-v1';
const REMINDER_CHECK_INTERVAL = 60 * 1000; // 1분마다 체크

// ─── Install ───
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  self.skipWaiting();
});

// ─── Activate ───
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(self.clients.claim());
  // 알림 스케줄러 시작
  startReminderChecker();
});

// ─── Message from main app ───
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  if (type === 'UPDATE_REMINDERS') {
    // 메인 앱에서 리마인더 데이터 수신
    self._reminderData = data;
    console.log('[SW] Reminders updated:', data);
  }

  if (type === 'START_CHECKER') {
    startReminderChecker();
  }
});

// ─── Notification Click ───
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // 이미 열린 탭이 있으면 포커스
      for (const client of clients) {
        if (client.url.includes('/') && 'focus' in client) {
          return client.focus();
        }
      }
      // 없으면 새 탭 열기
      return self.clients.openWindow('/');
    })
  );
});

// ─── Reminder Checker ───
let checkerInterval = null;
// 오늘 이미 알림을 보낸 시간대 기록
let notifiedToday = {};

function startReminderChecker() {
  if (checkerInterval) clearInterval(checkerInterval);

  checkerInterval = setInterval(() => {
    checkAndNotify();
  }, REMINDER_CHECK_INTERVAL);

  // 시작 시 즉시 1회 체크
  checkAndNotify();
  console.log('[SW] Reminder checker started');
}

function checkAndNotify() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const todayKey = now.toISOString().slice(0, 10);

  // 날짜가 바뀌면 알림 기록 초기화
  if (notifiedToday._date !== todayKey) {
    notifiedToday = { _date: todayKey };
  }

  // SW에 저장된 리마인더 데이터가 없으면 스킵
  if (!self._reminderData) return;

  const { reminders, schedule, notiEnabled } = self._reminderData;

  // 알림 비활성화 상태면 스킵
  if (!notiEnabled) return;

  // 각 시간대 체크
  const slotLabels = {
    morning: '🌅 아침',
    evening: '🌙 저녁',
    bedtime: '😴 취침 전'
  };

  for (const [slot, setTime] of Object.entries(reminders)) {
    if (slot === '_date') continue;

    // 이미 오늘 이 시간대에 알림을 보냈으면 스킵
    if (notifiedToday[slot]) continue;

    // 설정 시간과 현재 시간 비교
    if (currentTime === setTime) {
      // 해당 시간대의 영양제 목록 찾기
      const slotSchedule = schedule?.find(s => s.slot === slot);
      const supplements = slotSchedule?.supplements || [];

      if (supplements.length === 0) continue;

      const suppNames = supplements.map(s => s.name).join(', ');
      const label = slotLabels[slot] || slot;

      // 알림 발송
      self.registration.showNotification('💊 MediCheck 복용 알림', {
        body: `${label} 복용 시간입니다!\n${suppNames}`,
        icon: '/icons/icon.svg',
        badge: '/icons/icon.svg',
        tag: `medicheck-${slot}-${todayKey}`,
        renotify: true,
        vibrate: [200, 100, 200],
        data: { slot, todayKey },
        actions: [
          { action: 'done', title: '✅ 복용 완료' },
          { action: 'snooze', title: '⏰ 10분 뒤' }
        ]
      });

      notifiedToday[slot] = true;
      console.log(`[SW] Notification sent: ${label} at ${setTime}`);
    }
  }
}

// ─── Notification Action Handler ───
self.addEventListener('notificationclick', (event) => {
  const { action } = event;
  const { slot, todayKey } = event.notification.data || {};

  event.notification.close();

  if (action === 'done') {
    // 복용 완료 처리 — 메인 앱에 메시지 전달
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        for (const client of clients) {
          client.postMessage({ type: 'DOSE_CHECKED', slot, todayKey });
        }
      })
    );
  } else if (action === 'snooze') {
    // 10분 뒤 재알림
    setTimeout(() => {
      notifiedToday[slot] = false; // 다시 알림 가능하게
    }, 10 * 60 * 1000);
  } else {
    // 기본 클릭 — 앱 열기
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        for (const client of clients) {
          if ('focus' in client) return client.focus();
        }
        return self.clients.openWindow('/');
      })
    );
  }
}, { once: false });
