// ═══════════════════════════════════════════
// Analysis Engine
// Interaction checking + timing recommendation
// ═══════════════════════════════════════════

import { INGREDIENTS, INTERACTIONS } from '../data/fallbackDB.js';
import { publicDataAPI } from '../api/publicData.js';

/**
 * 등록된 영양제들의 성분 간 상호작용 분석
 * @param {Array} supplements - 사용자가 등록한 영양제 목록
 * @returns {Object} { score, interactions, summary }
 */
export async function analyzeInteractions(supplements) {
  if (!supplements || supplements.length < 2) {
    return { score: 100, interactions: [], summary: '영양제를 2개 이상 등록해주세요.' };
  }

  // 1. 모든 성분 추출 (중복 제거 + 어떤 영양제에서 왔는지 추적)
  const ingredientMap = new Map(); // ingredientId -> [supplement names]
  for (const supp of supplements) {
    for (const ingId of (supp.ingredients || [])) {
      if (!ingredientMap.has(ingId)) ingredientMap.set(ingId, []);
      ingredientMap.get(ingId).push(supp.name);
    }
  }

  const allIngredientIds = [...ingredientMap.keys()];
  const results = [];

  // 2. 로컬 DB 상호작용 체크
  for (const rule of INTERACTIONS) {
    const hasA = allIngredientIds.includes(rule.ingredientA);
    const hasB = allIngredientIds.includes(rule.ingredientB);

    if (hasA && hasB) {
      const sourcesA = ingredientMap.get(rule.ingredientA);
      const sourcesB = ingredientMap.get(rule.ingredientB);

      results.push({
        ...rule,
        sourceA: sourcesA.join(', '),
        sourceB: sourcesB.join(', '),
        ingredientAName: INGREDIENTS[rule.ingredientA]?.nameKr || rule.ingredientA,
        ingredientBName: INGREDIENTS[rule.ingredientB]?.nameKr || rule.ingredientB,
      });
    }
  }

  // 3. API DUR 체크 (API 키가 있는 경우)
  if (publicDataAPI.isConfigured) {
    try {
      for (const ingId of allIngredientIds) {
        const ingData = INGREDIENTS[ingId];
        if (!ingData) continue;

        const durResults = await publicDataAPI.checkDURInteractions(ingData.nameKr);
        if (durResults && durResults.length > 0) {
          for (const dur of durResults) {
            // 이미 로컬 DB에서 찾은 것과 중복되지 않는 것만 추가
            const alreadyExists = results.some(
              (r) => r.title.includes(dur.ingredientA) && r.title.includes(dur.ingredientB)
            );
            if (!alreadyExists && dur.prohibition) {
              results.push({
                type: 'conflict',
                severity: 'warning',
                ingredientA: ingId,
                ingredientB: 'dur-api',
                ingredientAName: dur.ingredientA,
                ingredientBName: dur.ingredientB || '기타 성분',
                title: `⚠️ DUR 주의: ${dur.ingredientA}`,
                description: dur.prohibition,
                tip: '의약품안전사용서비스(DUR) 정보입니다. 자세한 사항은 약사에게 문의하세요.',
                sourceA: ingredientMap.get(ingId)?.join(', ') || '',
                sourceB: 'DUR DB',
                fromAPI: true,
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('DUR API 분석 실패, 로컬 DB 결과만 표시:', err);
    }
  }

  // 4. 점수 계산
  let score = 100;
  for (const r of results) {
    if (r.type === 'conflict' && r.severity === 'warning') score -= 15;
    else if (r.type === 'conflict' && r.severity === 'caution') score -= 8;
    else if (r.type === 'synergy') score += 3;
  }
  score = Math.max(0, Math.min(100, score));

  // 5. 시너지/충돌 분리 정렬
  const synergies = results.filter((r) => r.type === 'synergy');
  const conflicts = results.filter((r) => r.type === 'conflict');

  return {
    score,
    interactions: [...conflicts, ...synergies],
    conflictCount: conflicts.length,
    synergyCount: synergies.length,
    summary: _generateSummary(score, conflicts.length, synergies.length),
  };
}

/**
 * 최적 복용 스케줄 생성
 * @param {Array} supplements - 사용자가 등록한 영양제 목록
 * @returns {Object} { morning, evening, schedule }
 */
export function getTimingRecommendation(supplements) {
  if (!supplements || supplements.length === 0) {
    return { morning: [], evening: [], notes: [] };
  }

  const morning = [];
  const evening = [];
  const bedtime = [];
  const notes = [];

  // 각 영양제의 주요 성분 기반으로 복용 시간 결정
  for (const supp of supplements) {
    let morningScore = 0;
    let eveningScore = 0;
    let withFood = false;

    for (const ingId of (supp.ingredients || [])) {
      const ingData = INGREDIENTS[ingId];
      if (!ingData) continue;

      if (ingData.timing === 'morning') morningScore++;
      else if (ingData.timing === 'evening') eveningScore++;

      if (ingData.withFood) withFood = true;
    }

    const entry = {
      ...supp,
      withFood,
    };

    if (eveningScore > morningScore) {
      evening.push(entry);
    } else {
      morning.push(entry);
    }
  }

  // 충돌 성분 분리 처리
  // 칼슘 + 철분 처리: 철분을 아침으로, 칼슘을 저녁으로
  const morningIng = new Set();
  const eveningIng = new Set();

  morning.forEach((s) => s.ingredients?.forEach((i) => morningIng.add(i)));
  evening.forEach((s) => s.ingredients?.forEach((i) => eveningIng.add(i)));

  // 아침에 칼슘과 철분이 함께 있으면 칼슘 쪽 영양제를 저녁으로 이동
  if (morningIng.has('calcium') && morningIng.has('iron')) {
    const calciumSupps = morning.filter((s) => s.ingredients?.includes('calcium') && !s.ingredients?.includes('iron'));
    for (const s of calciumSupps) {
      const idx = morning.indexOf(s);
      if (idx !== -1) {
        morning.splice(idx, 1);
        evening.push(s);
        notes.push(`💡 ${s.name}을(를) 저녁으로 이동했습니다 (철분과의 흡수 방해 방지).`);
      }
    }
  }

  // 콜라겐은 취침 전 공복 권장
  const collagenInEvening = evening.filter((s) => s.ingredients?.includes('collagen'));
  if (collagenInEvening.length > 0) {
    for (const s of collagenInEvening) {
      bedtime.push(s);
      evening.splice(evening.indexOf(s), 1);
    }
    notes.push('💡 콜라겐은 취침 전 공복에 복용하면 흡수율이 높아집니다.');
  }

  // 유산균 공복 권장 노트
  const hasProbiotics = supplements.some((s) => s.ingredients?.includes('probiotics'));
  if (hasProbiotics) {
    notes.push('💡 유산균은 아침 공복 또는 식전에 복용하는 것이 좋습니다.');
  }

  // 마그네슘 저녁 노트
  if (eveningIng.has('magnesium') || morningIng.has('magnesium')) {
    notes.push('💡 마그네슘은 근육 이완 효과가 있어 저녁 복용이 숙면에 도움됩니다.');
  }

  return {
    morning,
    evening,
    bedtime,
    notes,
    schedule: [
      { time: '🌅 아침 (식사 후)', supplements: morning, label: '아침' },
      { time: '🌙 저녁 (식사 후)', supplements: evening, label: '저녁' },
      ...(bedtime.length > 0 ? [{ time: '😴 취침 전', supplements: bedtime, label: '취침 전' }] : []),
    ],
  };
}

function _generateSummary(score, conflictCount, synergyCount) {
  if (score >= 90) {
    return `전반적으로 안전합니다! 시너지 효과 ${synergyCount}건이 있습니다.`;
  } else if (score >= 70) {
    return `주의가 필요한 조합 ${conflictCount}건이 있습니다. 복용 시간을 조절해주세요.`;
  } else {
    return `⚠️ 충돌 ${conflictCount}건 발견! 복용 전 약사와 상담을 권장합니다.`;
  }
}
