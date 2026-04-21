// ═══════════════════════════════════════════
// Login Component - 소셜 로그인 화면
// ═══════════════════════════════════════════

import { signInWithGoogle, signInWithKakao } from '../lib/supabase.js';

export function renderLogin() {
  return `
    <div class="page active" id="page-login">
      <div class="login-container">
        <div class="login-hero">
          <h1 class="login-title">PillStack</h1>
          <p class="login-subtitle">스마트한 영양제 관리의 시작</p>
        </div>

        <div class="login-actions">
          <button class="login-btn google-btn" onclick="window.app.loginWithGoogle()">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Google로 계속하기</span>
          </button>

          <button class="login-btn kakao-btn" onclick="window.app.loginWithKakao()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#3C1E1E">
              <path d="M12 3C6.48 3 2 6.36 2 10.5c0 2.67 1.74 5.01 4.35 6.35-.14.49-.9 3.17-.93 3.37 0 0-.02.16.08.22.1.06.22.03.22.03.29-.04 3.38-2.22 3.92-2.6.76.11 1.55.17 2.36.17 5.52 0 10-3.36 10-7.5S17.52 3 12 3z"/>
            </svg>
            <span>카카오로 계속하기</span>
          </button>
        </div>

        <div class="login-footer">
          <p>로그인 시 <a href="#" onclick="event.preventDefault(); window.app.navigate('settings')">이용약관</a> 및 <a href="#" onclick="event.preventDefault(); window.app.navigate('settings')">개인정보 처리방침</a>에 동의하게 됩니다.</p>
        </div>
      </div>
    </div>
  `;
}
