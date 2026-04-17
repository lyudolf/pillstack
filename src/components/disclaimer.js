// ═══════════════════════════════════════════
// Disclaimer Component - 법적 고지 모달
// 최초 실행 시 동의 필수
// ═══════════════════════════════════════════

const DISCLAIMER_KEY = 'pillstack_disclaimer_agreed';

export function hasAgreedDisclaimer() {
  return localStorage.getItem(DISCLAIMER_KEY) === 'true';
}

export function showDisclaimerModal() {
  if (hasAgreedDisclaimer()) return;

  const existing = document.getElementById('disclaimer-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'disclaimer-modal';
  modal.innerHTML = `
    <div class="disclaimer-overlay">
      <div class="disclaimer-sheet">
        <div class="disclaimer-header">
          <div class="disclaimer-icon">⚖️</div>
          <h2>서비스 이용 안내</h2>
          <p class="disclaimer-sub">PillStack을 사용하기 전 아래 내용을 확인해주세요.</p>
        </div>

        <div class="disclaimer-body">
          <div class="disclaimer-section">
            <h3>📌 서비스 성격</h3>
            <p>본 앱은 <strong>의료기기가 아니며</strong>, 제공되는 모든 정보는 <strong>참고용</strong>입니다. 질병의 진단, 치료, 예방을 목적으로 하지 않습니다.</p>
          </div>

          <div class="disclaimer-section">
            <h3>🤖 AI 분석 한계</h3>
            <p>성분 분석 결과는 <strong>AI 추론 기반</strong>이며, 의학적 판단을 대체하지 않습니다. 정확한 복용 상담은 반드시 <strong>의사 또는 약사</strong>에게 문의하세요.</p>
          </div>

          <div class="disclaimer-section">
            <h3>📊 데이터 출처</h3>
            <p>영양제 정보는 <strong>식품의약품안전처 공공데이터</strong>(건강기능식품 정보)를 기반으로 합니다. 데이터의 정확성은 원본 출처에 따릅니다.</p>
          </div>

          <div class="disclaimer-section">
            <h3>⚠️ 개인차 안내</h3>
            <p>개인의 건강 상태, 복용 중인 약물, 알레르기 등에 따라 <strong>결과가 다를 수 있습니다</strong>. 특히 임산부, 수유부, 어린이는 전문가 상담 후 복용하세요.</p>
          </div>
        </div>

        <div class="disclaimer-footer">
          <button class="btn-primary disclaimer-agree-btn" onclick="window.app.agreeDisclaimer()">
            위 내용을 확인했으며 동의합니다
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.querySelector('.disclaimer-overlay').classList.add('active'));
}

export function agreeDisclaimer() {
  localStorage.setItem(DISCLAIMER_KEY, 'true');
  const modal = document.getElementById('disclaimer-modal');
  if (modal) {
    const overlay = modal.querySelector('.disclaimer-overlay');
    overlay.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  }
}
