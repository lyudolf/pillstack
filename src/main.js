// ═══════════════════════════════════════════
// MediCheck - Main Application Controller
// ═══════════════════════════════════════════


import { renderHome } from './components/home.js';
import { renderSearch, handleSearch, filterCategory, clearSearch, getSupplementById, initSearch } from './components/search.js';
import { renderCamera, initCamera, capturePhoto, handleImageUpload, retakePhoto, startOCR, destroyCamera } from './components/camera.js';
import { renderAnalysis } from './components/analysis.js';
import { renderSettings } from './components/settings.js';
import { renderSchedule, saveTimingResult, loadTimingResult } from './components/schedule.js';
import { renderCalendar, setCalendarMonth, handleDayClick } from './components/calendar.js';
import { showProductDetail, closeProductDetail, getCurrentProduct } from './components/detail.js';
import { showDisclaimerModal, agreeDisclaimer } from './components/disclaimer.js';
import { renderLogin } from './components/login.js';
import { analyzeInteractions, getTimingRecommendation } from './engine/analyzer.js';
import { publicDataAPI } from './api/publicData.js';
import { saveReminderTime, initServiceWorker, requestNotificationPermission, syncRemindersToSW, saveScheduleForSW } from './services/reminder.js';
import { signInWithGoogle, signInWithKakao, signOut, getSession, onAuthStateChange } from './lib/supabase.js';
import { fetchSupplements, insertSupplement, deleteSupplement, fetchAnalysis, upsertAnalysis, deleteAnalysis } from './services/db.js';

// ─── State Management ───
const STORAGE_KEY = 'medicheck_supplements';

export const state = {
  currentPage: 'home',
  supplements: [],
  analysisResult: null,
  timingResult: null,
  apiConnected: false,
  user: null,
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) state.supplements = JSON.parse(saved);
    const savedTiming = loadTimingResult();
    if (savedTiming) state.timingResult = savedTiming;
    const savedAnalysis = localStorage.getItem('pillstack_analysis_result');
    if (savedAnalysis) state.analysisResult = JSON.parse(savedAnalysis);
  } catch (e) {
    console.warn('로컈 데이터 로드 실패:', e);
  }
}

// 로그인 유저 Supabase 데이터 복원
async function loadUserData(userId) {
  try {
    const [supplements, analysis] = await Promise.all([
      fetchSupplements(userId),
      fetchAnalysis(userId),
    ]);
    if (supplements.length > 0) {
      state.supplements = supplements;
      saveState(); // localStorage 동기화
    }
    if (analysis) {
      state.analysisResult = analysis.result_data;
      state.timingResult = analysis.timing_data;
      if (analysis.result_data) localStorage.setItem('pillstack_analysis_result', JSON.stringify(analysis.result_data));
      if (analysis.timing_data) saveTimingResult(analysis.timing_data);
    }
    render();
  } catch (e) {
    console.warn('Supabase 데이터 로드 실패 (localhost fallback):', e);
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
  state.analysisResult = null;
  localStorage.removeItem('pillstack_analysis_result');
  // Supabase 동기화 (로그인 시)
  if (state.user) {
    insertSupplement(state.user.id, supplement).catch(e => console.warn('Supabase insert 실패:', e));
    deleteAnalysis(state.user.id).catch(() => {});
  }
  showToast(`✅ ${supplement.name} 추가됨!`, 'success');
}

export function removeSupplement(id) {
  const idx = state.supplements.findIndex((s) => s.id === id);
  if (idx !== -1) {
    const name = state.supplements[idx].name;
    state.supplements.splice(idx, 1);
    saveState();
    state.analysisResult = null;
    localStorage.removeItem('pillstack_analysis_result');
    // Supabase 동기화 (로그인 시)
    if (state.user) {
      deleteSupplement(state.user.id, id).catch(e => console.warn('Supabase delete 실패:', e));
      deleteAnalysis(state.user.id).catch(() => {});
    }
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
    // localStorage 저장
    localStorage.setItem('pillstack_analysis_result', JSON.stringify(state.analysisResult));
    saveTimingResult(state.timingResult);
    saveScheduleForSW(state.timingResult);
    // Supabase 저장 (로그인 시)
    if (state.user) {
      upsertAnalysis(state.user.id, state.analysisResult, state.timingResult)
        .catch(e => console.warn('Supabase analysis upsert 실패:', e));
    }
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
  a.download = `medicheck_backup_${new Date().toISOString().slice(0, 10)}.json`;
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

  // 로그인 안 됐으면 로그인 페이지
  if (!state.user) {
    app.innerHTML = renderLogin();
    return;
  }

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

  app.innerHTML = _renderGlobalHeader() + `<main class="app-content">${pageHTML}</main>` + _renderBottomNav();
}

function _renderGlobalHeader() {
  return `
    <header class="global-header">
      <div class="home-logo" onclick="window.app.navigate('home')" style="cursor:pointer;">
        <img src="/icons/icon.png" alt="PillStack" class="home-logo-icon" style="width:36px;height:36px;border-radius:8px;" />
        <span class="home-logo-text">PillStack</span>
      </div>
      <div class="home-header-actions">
        <button class="home-noti-btn" onclick="window.app.showToast('🔔 알림 기능 준비 중', 'info')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </button>
        <button class="home-noti-btn" onclick="window.app.navigate('settings')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </div>
    </header>
  `;
}

function _renderBottomNav() {
  const p = state.currentPage;
  const icons = {
    home: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    search: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    camera: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    analysis: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    settings: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  };
  return `
    <nav class="bottom-nav">
      <button class="nav-item ${p === 'home' ? 'active' : ''}"
              onclick="window.app.navigate('home')">
        <span class="nav-icon">${icons.home}</span>
        <span>홈</span>
      </button>
      <button class="nav-item ${p === 'search' ? 'active' : ''}"
              onclick="window.app.navigate('search')">
        <span class="nav-icon">${icons.search}</span>
        <span>검색</span>
      </button>
      <button class="nav-item nav-center-fab ${p === 'camera' ? 'active' : ''}"
              onclick="window.app.navigate('camera')">
        <span class="nav-fab-circle">${icons.camera}</span>
        <span>AI 인식</span>
      </button>
      <button class="nav-item ${p === 'analysis' || p === 'schedule' ? 'active' : ''}"
              onclick="window.app.navigate('analysis')">
        <span class="nav-icon">${icons.analysis}</span>
        <span>분석</span>
      </button>
      <button class="nav-item ${p === 'calendar' ? 'active' : ''}"
              onclick="window.app.navigate('calendar')">
        <span class="nav-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
        <span>캘린더</span>
      </button>
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
  switchAnalysisTab: (tabId) => {
    document.querySelectorAll('.analysis-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.analysis-tab').forEach(el => el.classList.remove('active'));
    const tab = document.getElementById('tab-' + tabId);
    if (tab) tab.style.display = 'block';
    const btn = document.querySelector(`.analysis-tab[data-tab="${tabId}"]`);
    if (btn) btn.classList.add('active');
  },
  agreeDisclaimer,
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
  loginWithGoogle: async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      showToast('Google 로그인 실패: ' + e.message, 'error');
    }
  },
  loginWithKakao: async () => {
    try {
      await signInWithKakao();
    } catch (e) {
      showToast('Kakao 로그인 실패: ' + e.message, 'error');
    }
  },
  logout: async () => {
    try {
      await signOut();
      state.user = null;
      render();
      showToast('로그아웃 되었습니다.', 'info');
    } catch (e) {
      showToast('로그아웃 실패', 'error');
    }
  },
};

// ─── Init ───
async function init() {
  loadState();

  // Supabase 세션 확인
  try {
    const session = await getSession();
    state.user = session?.user || null;
  } catch {
    state.user = null;
  }

  // 인증 상태 변화 감지
  onAuthStateChange(async (event, session) => {
    state.user = session?.user || null;
    if (event === 'SIGNED_IN' && state.user) {
      showToast(`👋 ${state.user?.user_metadata?.full_name || '사용자'}님 환영합니다!`, 'success');
      showDisclaimerModal();
      // Supabase에서 유저 데이터 복원
      await loadUserData(state.user.id);
    } else if (event === 'SIGNED_OUT') {
      // 로그아웃 시 상태 초기화
      state.supplements = [];
      state.analysisResult = null;
      state.timingResult = null;
      localStorage.removeItem('medicheck_supplements');
      localStorage.removeItem('pillstack_analysis_result');
      render();
    } else {
      render();
    }
  });

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
    // 로그인 상태에서만 법적 고지 표시
    if (state.user) showDisclaimerModal();
  }, 1200);
}

document.addEventListener('DOMContentLoaded', init);
