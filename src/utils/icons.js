// ═══════════════════════════════════════════
// SVG Icon Utility — 카테고리 기반 아이콘 매핑
// Linear 스타일 모노크롬 SVG 아이콘
// ═══════════════════════════════════════════

const SVG_ICONS = {
  // 비타민 (캡슐)
  vitamin: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="18" rx="6"/><line x1="6" y1="12" x2="18" y2="12"/></svg>`,

  // 유산균 (장/미생물)
  probiotic: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2a7 7 0 0 1 7 7c0 3-2 5-4 7s-3 4-3 6"/><path d="M12 2a7 7 0 0 0-7 7c0 3 2 5 4 7s3 4 3 6"/></svg>`,

  // 한방/식물 (잎)
  herbal: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8c2-2 4-6 4-6s-4 2-6 4-4 6-4 6 4-2 6-4z"/><path d="M3 22s2-4 4-6 6-4 6-4-4 2-6 4-4 6-4 6z"/><line x1="2" y1="22" x2="22" y2="2"/></svg>`,

  // 미네랄 (결정)
  mineral: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/><line x1="12" y1="22" x2="12" y2="15.5"/><line x1="22" y1="8.5" x2="12" y2="15.5"/><line x1="2" y1="8.5" x2="12" y2="15.5"/></svg>`,

  // 지방산/오메가 (물방울)
  omega: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c0 0-8 9.27-8 13a8 8 0 1 0 16 0C20 11.27 12 2 12 2z"/></svg>`,

  // 기능성 (톱니바퀴)
  function: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,

  // 기본 (알약 캡슐)
  default: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="5"/><line x1="7" y1="12" x2="17" y2="12"/></svg>`,
  // etc 전용 (기본 알약과 동일)
  etc: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="5"/><line x1="7" y1="12" x2="17" y2="12"/></svg>`,
};

// 이모지 → 카테고리 매핑
const EMOJI_TO_CATEGORY = {
  '💊': 'default', '🍊': 'vitamin', '🍋': 'vitamin', '☀️': 'vitamin',
  '🦠': 'probiotic', '🫧': 'probiotic',
  '🌿': 'herbal', '🌱': 'herbal', '🌸': 'herbal', '🌻': 'herbal',
  '⚡': 'mineral', '🦴': 'mineral',
  '🐟': 'omega', '💛': 'omega',
  '🔴': 'function', '💜': 'function', '🛡️': 'function', '✨': 'function',
  '👁️': 'function', '🔥': 'function', '🏃': 'function', '💪': 'function',
  '❤️': 'function', '🤰': 'function', '💚': 'function',
  '💇': 'function', '👩': 'function', '👨': 'function',
  '🐝': 'herbal', '🔵': 'mineral', '🟢': 'mineral',
};

// 카테고리별 아이콘 컬러
const CATEGORY_COLORS = {
  vitamin: '#f59e0b',
  probiotic: '#10b981',
  herbal: '#22c55e',
  mineral: '#7170ff',
  omega: '#38bdf8',
  function: '#f472b6',
  default: '#8a8f98',
};

/**
 * 이모지 또는 카테고리를 기반으로 SVG 아이콘 HTML 반환
 * @param {string} emojiOrCategory - 이모지 문자열 또는 카테고리 키
 * @returns {string} SVG wrapped in a styled container div
 */
export function getSupplementIcon(emojiOrCategory) {
  // 카테고리 키로 직접 매칭
  let category = SVG_ICONS[emojiOrCategory] ? emojiOrCategory : null;

  // 이모지 → 카테고리 변환
  if (!category) {
    category = EMOJI_TO_CATEGORY[emojiOrCategory] || 'default';
  }
  // etc는 default로
  if (category === 'etc') category = 'default';

  const svg = SVG_ICONS[category] || SVG_ICONS.default;
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.default;

  return `<div class="supp-icon-wrap" style="color:${color}">${svg}</div>`;
}
