// ═══════════════════════════════════════════
// MediCheck - Main Application Controller
// ═══════════════════════════════════════════

import './style.css';
import { renderHome } from './components/home.js';
import { renderSearch, handleSearch, filterCategory, clearSearch, getSupplementById, initSearch } from './components/search.js';
import { renderCamera, initCamera, capturePhoto, handleImageUpload, retakePhoto, startOCR, destroyCamera } from './components/camera.js';
import { renderAnalysis } from './components/analysis.js';
import { renderSettings } from './components/settings.js';
import { renderSchedule, saveTimingResult, loadTimingResult } from './components/schedule.js';
import { renderCalendar, setCalendarMonth, handleDayClick } from './components/calendar.js';
import { showProductDetail, closeProductDetail, getCurrentProduct } from './components/detail.js';
import { analyzeInteractions, getTimingRecommendation } from './engine/analyzer.js';
import { publicDataAPI } from './api/publicData.js';
import { saveReminderTime, initServiceWorker, requestNotificationPermission, syncRemindersToSW, saveScheduleForSW } from './services/reminder.js';

// ─── State Management ───
const STORAGE_KEY = 'medicheck_supplements';

export const state = {
  currentPage: 'home',
  supplements: [],
  analysisResult: null,
  timingResult: null,
  apiConnected: false,
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) state.supplements = JSON.parse(saved);
    // 저장된 분석 결과 복원
    const savedTiming = loadTimingResult();
    if (savedTiming) state.timingResult = savedTiming;
  } catch (e) {
    console.warn('로컬 데이터 로드 실패:', e);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.supplements));
}

// ─── Navigation ───
function navigate(page) {
  destroyCamera();
  state.currentPage = page;
  render();

  if (page === 'camera') {
    setTimeout(() => initCamera(), 300);
  }
  if (page === 'search') {
    setTimeout(() => initSearch(), 100);
  }
}

// ─── Supplement Management ───
export function addSupplement(supplement) {
  if (state.supplements.find((s) => s.id === supplement.id)) {
    showToast('이미 추가된 영양제입니다.', 'info');
    return;
  }
  state.supplements.push(supplement);
  saveState();
  showToast(`✅ ${supplement.name} 추가됨!`, 'success');
}

export function removeSupplement(id) {
  const idx = state.supplements.findIndex((s) => s.id === id);
  if (idx !== -1) {
    const name = state.supplements[idx].name;
    state.supplements.splice(idx, 1);
    saveState();
    showToast(`🗑️ ${name} 삭제됨`, 'info');
    render();
  }
}

// ─── Analysis ───
async function startAnalysis() {
  if (state.supplements.length < 2) {
    showToast('영양제를 2개 이상 등록해주세요.', 'error');
    return;
  }

  showLoading(true);

  try {
    state.analysisResult = await analyzeInteractions(state.supplements);
    state.timingResult = getTimingRecommendation(state.supplements);
    // 분석 결과 영구 저장 (복용관리 페이지에서 재사용)
    saveTimingResult(state.timingResult);
    // SW에 스케줄 동기화
    saveScheduleForSW(state.timingResult);
    state.currentPage = 'analysis';
    render();
  } catch (err) {
    console.error('분석 오류:', err);
    showToast('분석 중 오류가 발생했습니다.', 'error');
  } finally {
    showLoading(false);
  }
}

// ─── Search Actions ───
function addFromSearch(id) {
  const supplement = getSupplementById(id);
  if (supplement) {
    addSupplement(supplement);
    // Refresh search results to show checkmark
    const input = document.getElementById('search-input');
    if (input) handleSearch(input.value);
  }
}

// ─── Detail View ───
function showDetail(id) {
  const product = getSupplementById(id);
  if (product) showProductDetail(product);
}

function closeDetail() {
  closeProductDetail();
}

function addFromDetail() {
  const product = getCurrentProduct();
  if (product) {
    addSupplement(product);
    closeProductDetail();
  }
}

// ─── API Status ───
async function refreshApiStatus() {
  showToast('🔄 API 연결 확인 중...', 'info');
  const connected = await publicDataAPI.checkHealth();
  state.apiConnected = connected;
  showToast(connected ? '✅ 공공데이터 API 연결됨!' : '💾 로컬 DB 모드 사용 중', connected ? 'success' : 'info');
  render();
}

function clearAllData() {
  if (confirm('모든 데이터를 삭제하시겠습니까?')) {
    state.supplements = [];
    state.analysisResult = null;
    state.timingResult = null;
    localStorage.removeItem(STORAGE_KEY);
    showToast('🗑️ 모든 데이터가 초기화되었습니다.', 'info');
    navigate('home');
  }
}

async function toggleSetting(key, value) {
  localStorage.setItem(key, value);

  // 알림 토글 ON 시 권한 요청 + SW 동기화
  if (key === 'medicheck_noti' && value) {
    const permission = await requestNotificationPermission();
    if (permission === 'denied') {
      localStorage.setItem(key, false);
      showToast('⚠️ 알림 권한이 차단되어 있습니다. 브라우저 설정에서 허용해주세요.', 'error');
      render();
      return;
    }
    if (permission === 'granted') {
      syncRemindersToSW();
      showToast('🔔 복용 알림이 활성화되었습니다!', 'success');
    }
  } else if (key === 'medicheck_noti' && !value) {
    syncRemindersToSW();
    showToast('🔕 복용 알림이 비활성화되었습니다.', 'info');
  } else {
    showToast('✅ 설정이 저장되었습니다.', 'success');
  }
}

function exportData() {
  const data = {
    supplements: state.supplements,
    exportDate: new Date().toISOString(),
    version: '1.0.0',
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `medicheck_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📤 데이터를 내보냈습니다.', 'success');
}

function setReminderTime(slot, time) {
  saveReminderTime(slot, time);
  const labels = { morning: '아침', evening: '저녁', bedtime: '취침 전' };
  showToast(`⏰ ${labels[slot] || slot} 복용 시간: ${time}`, 'success');
}

function toggleDoseCheck(slot) {
  const today = new Date().toISOString().slice(0, 10);
  const key = 'medicheck_checked_' + today;
  let checked = [];
  try {
    const saved = localStorage.getItem(key);
    if (saved) checked = JSON.parse(saved);
  } catch (e) { /* ignore */ }

  const idx = checked.indexOf(slot);
  if (idx === -1) {
    checked.push(slot);
    showToast('✅ 복용 완료!', 'success');
  } else {
    checked.splice(idx, 1);
    showToast('↩️ 복용 체크 해제', 'info');
  }
  localStorage.setItem(key, JSON.stringify(checked));
  render();
}

// ─── UI Helpers ───
function showToast(message, type = 'info') {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.className = `toast ${type}`;
  toast.innerHTML = message;

  requestAnimationFrame(() => {
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  });
}

function showLoading(show) {
  let overlay = document.getElementById('loading-overlay');
  if (!overlay && show) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-icon">💊</div>
      <div class="loading-text">성분 분석 중...</div>
      <div class="loading-sub">상호작용을 확인하고 있어요</div>
      <div style="margin-top:16px;"><div class="spinner"></div></div>
    `;
    document.body.appendChild(overlay);
  }

  if (overlay) {
    requestAnimationFrame(() => overlay.classList.toggle('active', show));
    if (!show) {
      setTimeout(() => overlay?.remove(), 300);
    }
  }
}

// ─── Render ───
function render() {
  const app = document.getElementById('app');
  let pageHTML = '';

  switch (state.currentPage) {
    case 'home':
      pageHTML = renderHome();
      break;
    case 'search':
      pageHTML = renderSearch();
      break;
    case 'schedule':
      pageHTML = renderSchedule();
      break;
    case 'calendar':
      pageHTML = renderCalendar();
      break;
    case 'camera':
      pageHTML = renderCamera();
      break;
    case 'analysis':
      pageHTML = renderAnalysis(state.analysisResult, state.timingResult);
      break;
    case 'settings':
      pageHTML = renderSettings();
      break;
    default:
      pageHTML = renderHome();
  }

  app.innerHTML = pageHTML + _renderBottomNav();
}

function _renderBottomNav() {
  const items = [
    { id: 'home', icon: '🏠', label: '홈' },
    { id: 'calendar', icon: '📅', label: '캘린더' },
    { id: 'schedule', icon: '⏰', label: '복용관리' },
    { id: 'camera', icon: '🏷️', label: '인식' },
    { id: 'settings', icon: '⚙️', label: '설정' },
  ];

  return `
    <nav class="bottom-nav">
      ${items.map((item) => `
        <button class="nav-item ${state.currentPage === item.id ? 'active' : ''}"
                onclick="window.app.navigate('${item.id}')">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </button>
      `).join('')}
    </nav>
  `;
}

window.app = {
  navigate,
  addSupplement,
  removeSupplement,
  addFromSearch,
  showDetail,
  closeDetail,
  addFromDetail,
  startAnalysis,
  handleSearch,
  filterCategory,
  clearSearch,
  capturePhoto,
  handleImageUpload,
  retakePhoto,
  startOCR,
  refreshApiStatus,
  clearAllData,
  toggleSetting,
  exportData,
  setReminderTime,
  toggleDoseCheck,
  showToast,
  getState: () => state,
  showShelfDetail: (id) => {
    const supp = state.supplements.find(s => s.id === id);
    if (supp) showProductDetail(supp);
  },
  // Calendar
  calPrev: () => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth());
    // Get current view from calendar state
    let m = parseInt(localStorage.getItem('_cal_m') ?? new Date().getMonth());
    let y = parseInt(localStorage.getItem('_cal_y') ?? new Date().getFullYear());
    m--;
    if (m < 0) { m = 11; y--; }
    localStorage.setItem('_cal_m', m);
    localStorage.setItem('_cal_y', y);
    setCalendarMonth(y, m);
    render();
  },
  calNext: () => {
    let m = parseInt(localStorage.getItem('_cal_m') ?? new Date().getMonth());
    let y = parseInt(localStorage.getItem('_cal_y') ?? new Date().getFullYear());
    m++;
    if (m > 11) { m = 0; y++; }
    localStorage.setItem('_cal_m', m);
    localStorage.setItem('_cal_y', y);
    setCalendarMonth(y, m);
    render();
  },
  calDayClick: (dateStr) => {
    const msg = handleDayClick(dateStr);
    showToast(msg, 'info');
  },
};

// ─── Init ───
async function init() {
  loadState();

  // Service Worker 등록 (푸시 알림용)
  await initServiceWorker();

  // Check backend API status
  try {
    const connected = await publicDataAPI.checkHealth();
    state.apiConnected = connected;
  } catch {
    state.apiConnected = false;
  }

  // SW에서 복용 완료 이벤트 수신
  window.addEventListener('dose-checked', (e) => {
    render();
    showToast('✅ 복용 완료 처리됨!', 'success');
  });

  // Hide splash after brief delay
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.classList.add('hidden');
      setTimeout(() => splash.remove(), 600);
    }
    render();
  }, 1200);
}

document.addEventListener('DOMContentLoaded', init);
