// ═══════════════════════════════════════════
// Camera Component - 카메라 촬영 UI
// ═══════════════════════════════════════════

let videoStream = null;

export function renderCamera() {
  return `
    <div class="page active" id="page-camera">
      <div class="page-header">
        <h1>📷 영양제 촬영</h1>
        <p class="subtitle">영양제 라벨을 촬영해주세요</p>
      </div>
      <div class="page-content">
        <div class="camera-container" id="camera-container">
          <video id="camera-video" autoplay playsinline></video>
          <canvas id="camera-canvas"></canvas>
          <div class="camera-overlay">
            <div class="camera-viewfinder"></div>
            <p class="camera-hint">영양 성분표가 잘 보이도록 촬영해주세요</p>
          </div>
        </div>
        <div class="camera-actions">
          <button class="camera-btn" id="capture-btn" onclick="window.app.capturePhoto()"></button>
        </div>
        <div class="card animate-in" style="margin-top:20px; text-align:center;">
          <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.6;">
            📌 <strong>현재 MVP 버전</strong>에서는 촬영 후 자동 인식이 제공되지 않습니다.<br>
            촬영 후 <strong>검색을 통해</strong> 해당 영양제를 추가해주세요.
          </p>
          <button class="btn-primary" style="margin-top:12px;" onclick="window.app.navigate('search')">
            🔍 검색으로 추가하기
          </button>
        </div>
      </div>
    </div>
  `;
}

export async function initCamera() {
  try {
    const video = document.getElementById('camera-video');
    if (!video) return;

    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    video.srcObject = videoStream;
  } catch (err) {
    console.warn('카메라 접근 실패:', err);
    const container = document.getElementById('camera-container');
    if (container) {
      container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;padding:24px;">
          <div style="font-size:3rem;margin-bottom:12px;">📵</div>
          <p style="color:var(--text-secondary);text-align:center;font-size:0.85rem;">
            카메라 접근 권한이 필요합니다.<br>
            브라우저 설정에서 카메라 권한을 허용해주세요.
          </p>
        </div>
      `;
    }
  }
}

export function capturePhoto() {
  const video = document.getElementById('camera-video');
  const canvas = document.getElementById('camera-canvas');
  if (!video || !canvas) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  // Show toast
  window.app.showToast('📸 촬영 완료! 검색을 통해 영양제를 추가해주세요.', 'info');
}

export function destroyCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach((track) => track.stop());
    videoStream = null;
  }
}
