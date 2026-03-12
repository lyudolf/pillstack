// ═══════════════════════════════════════════
// Settings Component - 앱 설정 및 상태 확인
// ═══════════════════════════════════════════

import { publicDataAPI } from '../api/publicData.js';

export function renderSettings() {
  const isConnected = publicDataAPI.isConfigured;

  return `
    <div class="page active" id="page-settings">
      <div class="page-header">
        <h1>⚙️ 설정</h1>
        <p class="subtitle">앱 정보 및 데이터 관리</p>
      </div>
      <div class="page-content">
        <!-- API Connection Status -->
        <div class="settings-group animate-in">
          <div class="settings-group-title">공공데이터 연동 상태</div>

          <div class="card" style="margin-bottom:12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <span style="font-size:0.85rem;font-weight:600;">API 서버 상태</span>
              <span class="status-badge ${isConnected ? 'api-on' : 'api-off'}">
                ${isConnected ? '🟢 연결됨' : '🟡 로컬 DB 모드'}
              </span>
            </div>
            <p style="font-size:0.75rem;color:var(--text-secondary);line-height:1.5;margin-bottom:12px;">
              ${isConnected
                ? '공공데이터포털 API가 연결되어 있습니다. 건강기능식품 실시간 검색 및 DUR 병용금기 정보를 사용합니다.'
                : '현재 내장 데이터베이스를 사용 중입니다. 서버에 API 키가 설정되면 자동으로 공공데이터에 연결됩니다.'}
            </p>
            <button class="btn-secondary" style="padding:10px;" onclick="window.app.refreshApiStatus()">
              🔄 연결 상태 확인
            </button>
          </div>
        </div>

        <!-- Data Sources Info -->
        <div class="settings-group animate-in animate-in-delay-1">
          <div class="settings-group-title">데이터 소스</div>
          <div class="settings-item">
            <div>
              <div class="settings-label">건강기능식품 정보</div>
              <div class="settings-desc">식품의약품안전처 (제품 검색/성분 조회)</div>
            </div>
            <span class="status-badge ${isConnected ? 'api-on' : 'api-off'}">${isConnected ? '🌐 API' : '💾 로컬'}</span>
          </div>
          <div class="settings-item">
            <div>
              <div class="settings-label">DUR 병용금기 정보</div>
              <div class="settings-desc">의약품안전사용서비스 (상호작용 체크)</div>
            </div>
            <span class="status-badge ${isConnected ? 'api-on' : 'api-off'}">${isConnected ? '🌐 API' : '💾 로컬'}</span>
          </div>
          <div class="settings-item">
            <div>
              <div class="settings-label">내장 영양제 DB</div>
              <div class="settings-desc">한국 인기 영양제 30종+, 상호작용 14건</div>
            </div>
            <span class="status-badge api-on">✅ 활성</span>
          </div>
        </div>

        <!-- App Management -->
        <div class="settings-group animate-in animate-in-delay-2">
          <div class="settings-group-title">데이터 관리</div>
          <div class="settings-item" onclick="window.app.clearAllData()">
            <div>
              <div class="settings-label" style="color:var(--accent-red);">🗑️ 데이터 초기화</div>
              <div class="settings-desc">등록된 영양제 목록을 모두 삭제합니다</div>
            </div>
          </div>
        </div>

        <!-- Disclaimer -->
        <div class="card animate-in animate-in-delay-3" style="margin-top:8px;">
          <p style="font-size:0.7rem;color:var(--text-muted);line-height:1.6;text-align:center;">
            ⚠️ MediCheck는 참고용 영양 정보를 제공합니다.<br>
            정확한 복용 상담은 의사 또는 약사에게 문의해주세요.<br>
            <br>
            데이터 출처: 식품의약품안전처 공공데이터<br>
            MediCheck v1.0.0 · © 2026
          </p>
        </div>
      </div>
    </div>
  `;
}
