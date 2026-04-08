// ═══════════════════════════════════════════
// MediCheck Backend Server
// 공공데이터포털 API 프록시 서버
// API 키를 서버에서 안전하게 관리
// ═══════════════════════════════════════════

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { readFileSync, existsSync } from 'fs';

// ─── 건강기능식품 정적 DB 로드 ───
let supplementsDB = [];
const DB_PATH = 'data/supplements-db.json';
try {
  if (existsSync(DB_PATH)) {
    const raw = JSON.parse(readFileSync(DB_PATH, 'utf-8'));
    supplementsDB = (raw.items || []).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    console.log(`  📦 영양제 DB 로드: ${supplementsDB.length.toLocaleString()}건 (${raw.version})`);
  } else {
    console.warn('  ⚠️  data/supplements-db.json 없음. node scripts/download-supplements.js 실행 필요');
  }
} catch (e) {
  console.error('  ❌ DB 로드 실패:', e.message);
}

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.PUBLIC_DATA_API_KEY;
const FOOD_SAFETY_KEY = process.env.FOOD_SAFETY_API_KEY;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── 공공데이터 API 호출 유틸 ───
// 핵심: .env의 키가 이미 URL 인코딩된 상태(Encoding Key)이므로
// serviceKey는 그대로 넣고, 나머지 파라미터만 인코딩
function buildApiUrl(baseUrl, serviceKey, params) {
  const queryParts = [`serviceKey=${serviceKey}`]; // 이미 인코딩된 키 그대로 사용
  for (const [key, value] of Object.entries(params)) {
    queryParts.push(`${key}=${encodeURIComponent(value)}`);
  }
  return `${baseUrl}?${queryParts.join('&')}`;
}

// ─── Health Check ───
app.get('/api/health', (req, res) => {
  const apiConfigured = !!API_KEY && API_KEY !== '여기에_API_키를_입력하세요';
  const foodSafetyConfigured = !!FOOD_SAFETY_KEY && FOOD_SAFETY_KEY !== '여기에_개별인정형_API_키를_입력하세요';
  const dbLoaded = supplementsDB.length > 0;

  res.json({
    status: 'ok',
    apiConfigured: apiConfigured || dbLoaded,
    foodSafetyConfigured,
    services: {
      healthFood: dbLoaded,
      dur: apiConfigured,
      ingredient: foodSafetyConfigured,
    },
    dbCount: supplementsDB.length,
  });
});

// ─── 제품명 기반 카테고리 자동 분류 ───
const CATEGORY_RULES = [
  { id: 'vitamin',   icon: '🍊', keywords: ['비타민c', '비타민 c', 'vitamin c', '비타민d', '비타민 d', 'vitamin d', '비타민b', '비타민 b', 'vitamin b', 'b군', '비타민a', '비타민 a', 'vitamin a', '베타카로틴', '비타민e', '비타민 e', 'vitamin e', '멀티비타민', '종합비타민', '멀티 비타민', 'multivitamin'] },
  { id: 'probiotic', icon: '🦠', keywords: ['유산균', '프로바이오틱', 'probiot', '혼합유산균', '락토바실러스', '식이섬유', '프리바이오틱', 'fiber'] },
  { id: 'herbal',    icon: '🌿', keywords: ['홍삼', '인삼', 'ginseng', '진세노사이드', '밀크씨슬', '실리마린', 'silymarin', 'milk thistle', '프로폴리스', 'propolis'] },
  { id: 'mineral',   icon: '⚡', keywords: ['아연', 'zinc', '철분', '철 ', 'iron', '헴철', '칼슘', 'calcium', '칼시움', '마그네슘', 'magnesium', '셀레늄', 'selenium', '셀렌'] },
  { id: 'omega',     icon: '🐟', keywords: ['오메가3', '오메가 3', 'omega-3', 'omega3', 'epa', 'dha', '크릴', 'krill', '감마리놀렌', '달맞이꽃', 'gla'] },
  { id: 'function',  icon: '🦴', keywords: ['루테인', 'lutein', '지아잔틴', '콜라겐', 'collagen', 'msm', '글루코사민', 'glucosamine', '콘드로이틴', '코엔자임', 'coq10', 'coenzyme', '크레아틴', 'creatine', '프로틴', 'protein', '단백질'] },
];

function classifyProduct(name) {
  const n = name.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => n.includes(kw))) {
      return { category: rule.id, icon: rule.icon };
    }
  }
  return { category: 'etc', icon: '💊' };
}

// ─── 건강기능식품 제품 검색 (정적 DB 기반) ───
app.get('/api/supplements/search', (req, res) => {
  const { keyword, page = 1, size = 20, category } = req.query;

  if (supplementsDB.length === 0) {
    return res.json({ items: [], source: 'none', message: '영양제 DB가 로드되지 않았습니다.' });
  }

  // keyword 있으면 필터, 없으면 전체
  let matched;
  if (keyword && keyword.trim()) {
    const kw = keyword.toLowerCase();
    matched = supplementsDB.filter(
      (item) => item.name.toLowerCase().includes(kw) || item.brand.toLowerCase().includes(kw)
    );
  } else {
    matched = supplementsDB;
  }

  // 카테고리 필터 (서버 사이드)
  if (category && category !== 'all') {
    matched = matched.filter((item) => classifyProduct(item.name).category === category);
  }

  // 페이지네이션
  const pageNum = Number(page);
  const pageSize = Number(size);
  const startIdx = (pageNum - 1) * pageSize;
  const paged = matched.slice(startIdx, startIdx + pageSize);

  // 프론트엔드 형식으로 매핑
  const items = paged.map((item) => {
    const { category: cat, icon } = classifyProduct(item.name);
    return {
      id: `api-${item.registNo || Math.random().toString(36).substr(2, 9)}`,
      name: item.name,
      brand: item.brand,
      registNo: item.registNo,
      registDate: item.registDate,
      description: '',
      rawMaterials: '',
      ingredients: parseIngredients(item.name),
      source: 'api',
      icon,
      category: cat,
    };
  });

  res.json({
    items,
    source: 'db',
    total: matched.length,
    page: pageNum,
    totalPages: Math.ceil(matched.length / pageSize),
    hasMore: startIdx + pageSize < matched.length,
  });
});

// ─── 건강기능식품 제품 상세 정보 (로컬 DB) ───
app.get('/api/supplements/detail', (req, res) => {
  const { registNo } = req.query;

  if (!registNo) {
    return res.status(400).json({ error: '신고번호(registNo)를 입력해주세요.' });
  }

  const item = supplementsDB.find(i => i.registNo === registNo);
  if (!item) {
    return res.json({ item: null, source: 'db', message: '해당 제품 없음' });
  }

  res.json({
    item: {
      name: item.name,
      brand: item.brand,
      registNo: item.registNo,
      registDate: item.registDate,
      mainFunction: item.mainFunction || '',
      intake: item.intake || '',
      caution: item.caution || '',
      appearance: item.appearance || '',
      preservation: item.preservation || '',
      shelfLife: item.shelfLife || '',
    },
    source: 'db',
  });
});

// ─── Gemini Vision 라벨 인식 ───
const GEMINI_KEY = process.env.GEMINI_API_KEY;

app.post('/api/ocr/analyze', express.json({ limit: '10mb' }), async (req, res) => {
  const { image } = req.body; // base64 data URI

  if (!image) {
    return res.status(400).json({ error: '이미지 데이터가 없습니다.' });
  }

  if (!GEMINI_KEY || GEMINI_KEY.includes('여기에')) {
    return res.status(400).json({ error: 'Gemini API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.' });
  }

  try {
    // base64 데이터 추출
    const base64Match = image.match(/^data:image\/(.*?);base64,(.*)$/);
    if (!base64Match) {
      return res.status(400).json({ error: '유효하지 않은 이미지 형식입니다.' });
    }
    const mimeType = `image/${base64Match[1]}`;
    const base64Data = base64Match[2];

    // Gemini API 호출
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `이 영양제/건강기능식품 라벨 이미지를 분석하세요.
JSON만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

응답 형식:
{"productName":"제품명","brand":"브랜드명","ingredients":["성분1","성분2"],"keywords":["키워드1","키워드2"]}

규칙:
- productName: 라벨의 정확한 제품명 (제품 고유이름만, 브랜드명 제외)
- brand: 핵심 고유 브랜드명만 추출. 아래 불용어는 반드시 제거:
  제거 대상: 주식회사, (주), 제약, 약품, 건강, 바이오, 헬스케어, Inc, Co, Ltd, Corp
  예시: "(주)CMG제약" → "CMG", "종근당건강(주)" → "종근당", "GC녹십자" → "GC녹십자"
- ingredients: 주요 영양 성분 (한국어, 최대 5개)
- keywords: DB 검색용 키워드 (최대 5개). 제품명+브랜드 조합 포함
- 배열에 ... 사용 금지. 실제 값만 넣으세요.`
            },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          thinkingConfig: { thinkingBudget: 256 },
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API 오류 (${geminiRes.status}): ${errText.substring(0, 200)}`);
    }

    const geminiData = await geminiRes.json();
    
    // Gemini 2.5 Flash는 thinking 파트를 포함할 수 있음
    // 모든 parts에서 text를 수집하여 JSON을 찾음
    const allParts = geminiData.candidates?.[0]?.content?.parts || [];
    let rawText = '';
    for (const part of allParts) {
      if (part.text) rawText += part.text + '\n';
    }
    // 디버그: 전체 응답 구조를 파일로 덤프
    const { writeFileSync } = await import('fs');
    writeFileSync('/tmp/gemini-debug.json', JSON.stringify(geminiData, null, 2));
    console.log('  📄 전체 응답 → /tmp/gemini-debug.json 저장됨');
    console.log('  📄 parts 수:', allParts.length, '| 각 part 타입:', allParts.map(p => Object.keys(p).join(',')));
    console.log('  📄 rawText 전체:', rawText);

    // markdown code fence 제거 후 JSON 파싱
    const stripped = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    
    // JSON 블록 추출 (greedy)
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    let parsed = { productName: '', brand: '', ingredients: [], keywords: [] };
    if (jsonMatch) {
      let jsonStr = jsonMatch[0];
      try {
        parsed = JSON.parse(jsonStr);
        console.log('  ✅ 파싱 성공:', JSON.stringify(parsed));
      } catch (e) {
        console.log('  ⚠️ JSON 파싱 실패, 복구 시도:', e.message);
        // 불완전 JSON 복구: 열린 괄호 닫기
        try {
          jsonStr = jsonStr.replace(/,\s*$/, '');  // trailing comma 제거
          const openBrackets = (jsonStr.match(/\[/g) || []).length - (jsonStr.match(/\]/g) || []).length;
          const openBraces = (jsonStr.match(/\{/g) || []).length - (jsonStr.match(/\}/g) || []).length;
          jsonStr += ']'.repeat(Math.max(0, openBrackets)) + '}'.repeat(Math.max(0, openBraces));
          parsed = JSON.parse(jsonStr);
          console.log('  ✅ 복구 파싱 성공:', JSON.stringify(parsed));
        } catch (e2) {
          console.log('  ❌ 복구도 실패:', e2.message);
          // 최소한 rawText에서 키워드 추출
          const nameMatch = rawText.match(/productName["']?\s*:\s*["']([^"']+)/i);
          const brandMatch = rawText.match(/brand["']?\s*:\s*["']([^"']+)/i);
          if (nameMatch) parsed.productName = nameMatch[1];
          if (brandMatch) parsed.brand = brandMatch[1];
          console.log('  🔧 regex fallback:', parsed.productName, parsed.brand);
        }
      }
    } else {
      console.log('  ⚠️ JSON 매칭 실패, stripped:', stripped);
    }

    // DB 매칭: 제품명 + 브랜드 + 키워드로 검색
    const searchTerms = [
      parsed.productName,
      parsed.brand,
      ...(parsed.keywords || []),
      ...(parsed.ingredients || []),
    ].filter(Boolean);

    console.log('  🔎 검색어:', searchTerms);
    const matches = _matchFromDB(searchTerms, parsed);
    console.log('  🎯 매칭 결과:', matches.length, '건', matches.slice(0, 3).map(m => m.name));

    res.json({
      analysis: parsed,
      rawText,
      matches,
      searchTerms,
    });
  } catch (err) {
    console.error('Gemini Vision 오류:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DB 매칭 헬퍼 — 2단계: 브랜드 필터 → 제품명 매칭
function _matchFromDB(terms, analysis) {
  // 불용어(법인/업종 표기) 제거 + 공백/특수문자 제거
  const STOPWORDS = /주식회사|\(주\)|제약|약품|건강|바이오|헬스케어|inc|co\.?|ltd\.?|corp/gi;
  const normalize = (s) => s.replace(STOPWORDS, '').toLowerCase().replace(/[\s·\-_&앤(),.]/g, '');
  const brand = analysis?.brand || '';
  const productName = analysis?.productName || '';
  const ingredients = analysis?.ingredients || [];
  const keywords = analysis?.keywords || [];

  // ── 1단계: 브랜드로 DB 축소 ──
  let candidates = supplementsDB;
  if (brand) {
    const brandNorm = normalize(brand);
    // 전체 브랜드명으로 필터
    let brandFiltered = supplementsDB.filter(item => {
      const bn = normalize(item.brand || '');
      const nn = normalize(item.name);
      return bn.includes(brandNorm) || nn.includes(brandNorm);
    });
    // 전체 매칭이 적으면, 브랜드의 개별 단어로 재시도
    if (brandFiltered.length < 3) {
      const brandWords = brand.split(/[\s·\-_&()주식회사]+/).filter(w => w.length >= 2);
      for (const bw of brandWords) {
        const bwNorm = normalize(bw);
        if (bwNorm.length < 2) continue;
        const wider = supplementsDB.filter(item => {
          const bn = normalize(item.brand || '');
          const nn = normalize(item.name);
          return bn.includes(bwNorm) || nn.includes(bwNorm);
        });
        if (wider.length > brandFiltered.length) {
          brandFiltered = wider;
          console.log(`  🏢 브랜드 단어 "${bw}" 로 확장: ${wider.length}건`);
        }
      }
    }
    if (brandFiltered.length > 0) {
      candidates = brandFiltered;
      console.log(`  🏢 브랜드 "${brand}" 최종 필터: ${candidates.length}건으로 축소`);
    }
  }

  // ── 2단계: 제품명 + 성분으로 스코어링 ──
  const searchWords = new Set();
  // 제품명 단어 분리
  for (const w of productName.split(/[\s·\-_&앤]+/)) {
    if (w.length >= 2) searchWords.add(w);
  }
  // 성분 추가
  for (const ing of ingredients) {
    if (ing.length >= 2) searchWords.add(ing);
  }
  // 키워드 분리
  for (const kw of keywords) {
    for (const w of kw.split(/[\s·\-_&]+/)) {
      if (w.length >= 2) searchWords.add(w);
    }
  }

  console.log(`  🔤 매칭 단어:`, [...searchWords]);

  const scored = new Map();
  for (const word of searchWords) {
    const wn = normalize(word);
    if (wn.length < 2) continue;

    for (const item of candidates) {
      const nn = normalize(item.name);
      let score = 0;
      if (nn.includes(wn)) score += 3;
      if (wn.length > 3 && nn.startsWith(wn)) score += 2; // 앞부분 일치 가산

      if (score > 0) {
        const key = item.registNo;
        const existing = scored.get(key);
        if (existing) {
          existing.score += score;
        } else {
          scored.set(key, { ...item, score });
        }
      }
    }
  }

  // ── 3단계: 결과 0건이면 전체 DB fallback ──
  if (scored.size === 0 && candidates !== supplementsDB) {
    console.log('  🔄 브랜드 필터 결과 0건 → 전체 DB fallback');
    return _matchFromDB(terms, { ...analysis, brand: '' });
  }

  return [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ score, ...item }) => ({
      ...item,
      id: item.id || item.registNo,
      icon: item.icon || '💊',
    }));
}

// ─── DUR 병용금기 정보 조회 ───
// 엔드포인트: DURPrdlstInfoService03 (품목정보 서비스)
// 파라미터: INGR_NAME (성분 한글명, 대문자)
app.get('/api/dur/interactions', async (req, res) => {
  const { ingredient } = req.query;

  if (!ingredient) {
    return res.status(400).json({ error: '성분명(ingredient)을 입력해주세요.' });
  }

  if (!API_KEY || API_KEY === '여기에_API_키를_입력하세요') {
    return res.json({ items: [], source: 'none' });
  }

  try {
    const url = buildApiUrl(
      'http://apis.data.go.kr/1471000/DURPrdlstInfoService03/getUsjntTabooInfoList03',
      API_KEY,
      {
        INGR_NAME: ingredient,
        pageNo: '1',
        numOfRows: '50',
        type: 'json',
      }
    );

    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DUR API 응답 오류: ${response.status} - ${text}`);
    }

    const data = await response.json();
    const rawItems = data?.body?.items || [];

    const items = rawItems.map((item) => ({
      durSeq: item.DUR_SEQ || '',
      durType: item.TYPE_NAME || '',
      ingredientA: item.INGR_KOR_NAME || '',
      ingredientB: item.MIXTURE_INGR_KOR_NAME || '',
      itemName: item.ITEM_NAME || '',
      prohibition: item.PROHBT_CONTENT || item.TYPE_NAME || '',
      className: item.CLASS_NAME || '',
      formName: item.FORM_NAME || '',
    }));

    res.json({ items, source: 'api', total: data?.body?.totalCount || 0 });
  } catch (err) {
    console.error('DUR API 오류:', err.message);
    res.json({ items: [], source: 'error', message: err.message });
  }
});

// ─── 개별인정형 원료 정보 (별도 키) ───
app.get('/api/supplements/ingredient', async (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ error: '원료명(name)을 입력해주세요.' });
  }

  if (!FOOD_SAFETY_KEY || FOOD_SAFETY_KEY === '여기에_개별인정형_API_키를_입력하세요') {
    return res.json({ items: [], source: 'none', message: '개별인정형 API 키가 설정되지 않았습니다.' });
  }

  try {
    // 식품안전나라 API는 URL 구조가 다름: /api/{키}/{서비스ID}/{타입}/{시작}/{끝}
    const url = `http://openapi.foodsafetykorea.go.kr/api/${FOOD_SAFETY_KEY}/I-0050/json/1/10/RAWMTRL_NM=${encodeURIComponent(name)}`;

    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`개별인정형 API 응답 오류: ${response.status} - ${text}`);
    }

    const data = await response.json();
    const serviceData = data?.['I-0050'];

    // 식품안전나라 에러 처리
    if (serviceData?.RESULT?.CODE !== 'INFO-000') {
      const msg = serviceData?.RESULT?.MSG || '알 수 없는 오류';
      return res.json({ items: [], source: 'error', message: msg });
    }

    const rawItems = serviceData?.row || [];

    const items = rawItems.map((item) => ({
      approvalNo: item.HF_FNCLTY_MTRAL_RCOGN_NO || '',
      materialName: item.RAWMTRL_NM || '',
      functionality: item.PRIMARY_FNCLTY || item.FNCLTY_CN || '',
      dailyIntake: item.DAY_INTK_CN || '',
      caution: item.IFTKN_ATNT_MATR_CN || '',
    }));

    res.json({ items, source: 'api' });
  } catch (err) {
    console.error('개별인정형 API 오류:', err.message);
    res.json({ items: [], source: 'error', message: err.message });
  }
});

// ─── Gemini 성분 과다/충돌 분석 ───
app.post('/api/analyze/ingredients', async (req, res) => {
  const { supplements } = req.body; // [{ name, registNo }]

  if (!supplements || supplements.length < 2) {
    return res.status(400).json({ error: '영양제 2개 이상 필요' });
  }

  if (!GEMINI_KEY || GEMINI_KEY.includes('여기에')) {
    return res.json({ warnings: [], cautions: [], synergies: [], source: 'none' });
  }

  // DB에서 각 제품의 성분 정보 수집
  const productDetails = [];
  for (const supp of supplements) {
    const item = supplementsDB.find(i =>
      i.name === supp.name || i.registNo === supp.registNo
    );
    if (item) {
      productDetails.push({
        name: item.name,
        mainFunction: item.mainFunction || '',
        intake: item.intake || '',
        caution: item.caution || '',
      });
    } else {
      productDetails.push({ name: supp.name, mainFunction: '', intake: '', caution: '' });
    }
  }

  const productList = productDetails.map((p, i) =>
    `${i + 1}. ${p.name}\n   기능: ${p.mainFunction.slice(0, 500)}\n   복용법: ${p.intake.slice(0, 300)}\n   주의사항: ${p.caution.slice(0, 300)}`
  ).join('\n\n');

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `당신은 영양학·약학 전문가입니다. 아래 영양제를 동시 복용할 때의 성분 과다/충돌/시너지를 분석하세요.

[등록된 영양제]
${productList}

분석 규칙:
1. 각 제품의 "기능" 필드에서 핵심 영양 성분을 추출하세요.
2. 동일 성분이 여러 제품에 포함되어 일일 상한섭취량(UL)을 초과할 위험이 있으면 warnings에 추가하세요.
3. 동시 섭취 시 흡수를 방해하는 조합(예: 칼슘↔철분, 아연↔구리)은 cautions에 추가하세요.
4. 서로 흡수를 촉진하는 좋은 조합은 synergies에 추가하세요.
5. 확실한 근거가 있는 것만 포함하세요. 불확실하면 제외하세요.

JSON만 응답하세요:
{
  "extractedNutrients": [
    { "product": "제품명", "nutrients": ["성분1", "성분2"] }
  ],
  "warnings": [
    { "nutrient": "성분명", "products": ["제품A", "제품B"], "reason": "이유", "severity": "high" }
  ],
  "cautions": [
    { "nutrients": ["성분A", "성분B"], "products": ["제품A", "제품B"], "reason": "이유", "severity": "medium" }
  ],
  "synergies": [
    { "nutrients": ["성분A", "성분B"], "products": ["제품A", "제품B"], "reason": "이유" }
  ]
}`
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          thinkingConfig: { thinkingBudget: 512 },
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API 오류 (${geminiRes.status}): ${errText.substring(0, 200)}`);
    }

    const geminiData = await geminiRes.json();
    const allParts = geminiData.candidates?.[0]?.content?.parts || [];
    let rawText = '';
    for (const part of allParts) {
      if (part.text) rawText += part.text + '\n';
    }

    // JSON 파싱
    const stripped = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    let result = { extractedNutrients: [], warnings: [], cautions: [], synergies: [] };

    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn('  ⚠️ 성분 분석 JSON 파싱 실패:', e.message);
      }
    }

    console.log(`  🧪 성분 분석 완료: 경고 ${result.warnings?.length || 0}건, 주의 ${result.cautions?.length || 0}건, 시너지 ${result.synergies?.length || 0}건`);

    res.json({
      ...result,
      source: 'gemini',
    });
  } catch (err) {
    console.error('성분 분석 오류:', err.message);
    res.json({ warnings: [], cautions: [], synergies: [], source: 'error', message: err.message });
  }
});

// ─── 원료명 파싱 유틸 ───
function parseIngredients(rawMaterialStr) {
  const ingredientMap = {
    '비타민C': 'vitamin-c', '비타민D': 'vitamin-d', '비타민E': 'vitamin-e',
    '비타민A': 'vitamin-a', '비타민B1': 'vitamin-b1', '비타민B2': 'vitamin-b2',
    '비타민B6': 'vitamin-b6', '비타민B12': 'vitamin-b12', '비타민K': 'vitamin-k2',
    '엽산': 'folic-acid', '비오틴': 'biotin', '나이아신': 'niacin',
    '칼슘': 'calcium', '마그네슘': 'magnesium', '철분': 'iron', '철': 'iron',
    '아연': 'zinc', '셀레늄': 'selenium', '셀렌': 'selenium',
    'EPA': 'omega3-epa', 'DHA': 'omega3-dha', '오메가': 'omega3-epa',
    '유산균': 'probiotics', '프로바이오틱스': 'probiotics', '프리바이오틱스': 'prebiotics',
    '콜라겐': 'collagen', '히알루론산': 'hyaluronic-acid',
    '루테인': 'lutein', '지아잔틴': 'zeaxanthin',
    '밀크씨슬': 'silymarin', '실리마린': 'silymarin',
    '홍삼': 'red-ginseng', '진세노사이드': 'ginsenoside',
    '글루코사민': 'glucosamine', '아르기닌': 'l-arginine',
    '코엔자임': 'coenzyme-q10', '코큐텐': 'coenzyme-q10',
    '프로폴리스': 'propolis', '스피루리나': 'spirulina',
  };

  const found = [];
  for (const [keyword, id] of Object.entries(ingredientMap)) {
    if (rawMaterialStr.includes(keyword) && !found.includes(id)) {
      found.push(id);
    }
  }
  return found;
}

// ─── Start Server ───
app.listen(PORT, () => {
  const apiOk = API_KEY && API_KEY !== '여기에_API_키를_입력하세요';
  const foodOk = FOOD_SAFETY_KEY && FOOD_SAFETY_KEY !== '여기에_개별인정형_API_키를_입력하세요';

  console.log(`\n  🏥 MediCheck API Server`);
  console.log(`  ➜ http://localhost:${PORT}`);
  console.log(`  ➜ 공공데이터 API: ${apiOk ? '✅ 설정됨 (건강식품 + DUR)' : '⚠️ 미설정'}`);
  console.log(`  ➜ 개별인정형 API: ${foodOk ? '✅ 설정됨' : '⚠️ 미설정 (선택사항)'}\n`);
});
