// ═══════════════════════════════════════════
// MediCheck - Main Application Controller
// ═══════════════════════════════════════════

import './style.css';
import { renderHome } from './components/home.js';
import { renderSearch, handleSearch, filterCategory, getSupplementById } from './components/search.js';
import { renderCamera, initCamera, capturePhoto, destroyCamera } from './components/camera.js';
import { renderAnalysis } from './components/analysis.js';
import { renderSettings } from './components/settings.js';
import { analyzeInteractions, getTimingRecommendation } from './engine/analyzer.js';
import { publicDataAPI } from './api/publicData.js';

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
      pageHTML = renderHome() + renderSearch();
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
    { id: 'search', icon: '🔍', label: '검색' },
    { id: 'camera', icon: '📷', label: '촬영' },
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

// ─── Global API (for onclick handlers in templates) ───
window.app = {
  navigate,
  addSupplement,
  removeSupplement,
  addFromSearch,
  startAnalysis,
  handleSearch,
  filterCategory,
  capturePhoto,
  refreshApiStatus,
  clearAllData,
  showToast,
  getState: () => state,
};

// ─── Init ───
async function init() {
  loadState();

  // Check backend API status
  try {
    const connected = await publicDataAPI.checkHealth();
    state.apiConnected = connected;
  } catch {
    state.apiConnected = false;
  }

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
