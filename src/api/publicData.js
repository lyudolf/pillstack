// ═══════════════════════════════════════════
// Public Data API Client (Frontend)
// 우리 백엔드 서버를 통해 공공데이터 API 호출
// API 키는 서버에서 관리 (클라이언트 노출 없음)
// ═══════════════════════════════════════════

const API_BASE = '/api';

class PublicDataAPI {
  constructor() {
    this._connected = false;
  }

  get isConfigured() {
    return this._connected;
  }

  /**
   * 서버 헬스체크 및 API 설정 상태 확인
   */
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) return false;
      const data = await res.json();
      this._connected = data.apiConfigured === true;
      return this._connected;
    } catch {
      this._connected = false;
      return false;
    }
  }

  /**
   * 건강기능식품 제품 검색
   * @param {string} keyword - 검색어
   * @returns {Promise<Array|null>} 검색 결과
   */
  async searchHealthFood(keyword) {
    if (!this._connected) return null;

    try {
      const params = new URLSearchParams({ keyword, page: '1', size: '20' });
      const res = await fetch(`${API_BASE}/supplements/search?${params}`);
      if (!res.ok) return null;

      const data = await res.json();
      return data.items || [];
    } catch (err) {
      console.warn('건강기능식품 검색 오류:', err);
      return null;
    }
  }

  /**
   * DUR 병용금기 정보 조회
   * @param {string} ingredientName - 성분명
   * @returns {Promise<Array|null>} 병용금기 목록
   */
  async checkDURInteractions(ingredientName) {
    if (!this._connected) return null;

    try {
      const params = new URLSearchParams({ ingredient: ingredientName });
      const res = await fetch(`${API_BASE}/dur/interactions?${params}`);
      if (!res.ok) return null;

      const data = await res.json();
      return data.items || [];
    } catch (err) {
      console.warn('DUR API 오류:', err);
      return null;
    }
  }

  /**
   * 개별인정형 건강기능식품 원료 정보
   * @param {string} name - 원료명
   * @returns {Promise<Array|null>}
   */
  async getIngredientInfo(name) {
    if (!this._connected) return null;

    try {
      const params = new URLSearchParams({ name });
      const res = await fetch(`${API_BASE}/supplements/ingredient?${params}`);
      if (!res.ok) return null;

      const data = await res.json();
      return data.items || [];
    } catch (err) {
      console.warn('개별인정형 API 오류:', err);
      return null;
    }
  }
}

export const publicDataAPI = new PublicDataAPI();
