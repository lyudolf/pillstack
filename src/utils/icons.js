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
  vitamin: '#f2a65a',
  probiotic: '#46d98a',
  herbal: '#6fce7f',
  mineral: '#7fa7e8',
  omega: '#5fc4e0',
  function: '#e08bc7',
  default: '#87938f',
};

// ─── 공용 UI 아이콘 (이모지 대체 — 스트로크 라인 아이콘 통일) ───
const UI_SVGS = {
  // 시간대
  sun: `<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/>`,
  moon: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`,
  bed: `<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>`,
  // 오브젝트
  clock: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
  flask: `<path d="M10 2v7.31L4.34 19.03A2 2 0 0 0 6.07 22h11.86a2 2 0 0 0 1.73-2.97L14 9.31V2"/><line x1="8.5" y1="2" x2="15.5" y2="2"/><line x1="7" y1="16" x2="17" y2="16"/>`,
  pill: `<rect x="7" y="2" width="10" height="20" rx="5"/><line x1="7" y1="12" x2="17" y2="12"/>`,
  box: `<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/>`,
  cart: `<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>`,
  search: `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,
  scan: `<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/>`,
  // 상태
  alert: `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
  sparkle: `<path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/>`,
  check: `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`,
  bulb: `<line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>`,
  arrow: `<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>`,
  dna: `<path d="M2 15c6.667-6 13.333 0 20-6"/><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"/><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"/><path d="M17 6.5c-2.5-2.5-5-2.5-7.5 0"/><path d="M7 17.5c2.5 2.5 5 2.5 7.5 0"/>`,
  bot: `<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1"/><line x1="9" y1="13" x2="9" y2="15"/><line x1="15" y1="13" x2="15" y2="15"/>`,
  chat: `<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>`,
  calendar: `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`,
  bell: `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>`,
  camera: `<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>`,
  image: `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>`,
  target: `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
};

/**
 * UI 아이콘 SVG 반환 (섹션 타이틀·버튼·배지용)
 * @param {string} name - UI_SVGS 키
 * @param {number} size - px (기본 16)
 */
export function uiIcon(name, size = 16) {
  const body = UI_SVGS[name] || UI_SVGS.pill;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;">${body}</svg>`;
}

/**
 * 카테고리 아이콘 SVG 반환 (검색 필터 칩용 — 카테고리 고유색 적용)
 * @param {string} category - CATEGORIES 키 (all/vitamin/probiotic/...)
 * @param {number} size - px (기본 14)
 */
export function categoryIcon(category, size = 14) {
  const key = SVG_ICONS[category] ? category : 'default';
  const svg = (SVG_ICONS[key] || SVG_ICONS.default)
    .replace('width="28" height="28"', `width="${size}" height="${size}"`);
  const color = CATEGORY_COLORS[key] || CATEGORY_COLORS.default;
  return `<span style="display:inline-flex;align-items:center;color:${color};">${svg}</span>`;
}

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
