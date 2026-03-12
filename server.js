// ═══════════════════════════════════════════
// MediCheck Backend Server
// 공공데이터포털 API 프록시 서버
// API 키를 서버에서 안전하게 관리
// ═══════════════════════════════════════════

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.PUBLIC_DATA_API_KEY;

app.use(cors());
app.use(express.json());

// ─── Health Check ───
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apiConfigured: !!API_KEY && API_KEY !== '여기에_API_키를_입력하세요',
  });
});

// ─── 건강기능식품 제품 검색 ───
app.get('/api/supplements/search', async (req, res) => {
  const { keyword, page = 1, size = 20 } = req.query;

  if (!keyword) {
    return res.status(400).json({ error: '검색어(keyword)를 입력해주세요.' });
  }

  if (!API_KEY || API_KEY === '여기에_API_키를_입력하세요') {
    return res.json({ items: [], source: 'none', message: 'API 키가 설정되지 않았습니다.' });
  }

  try {
    const params = new URLSearchParams({
      serviceKey: API_KEY,
      prdlstNm: keyword,
      pageNo: String(page),
      numOfRows: String(size),
      type: 'json',
    });

    const url = `http://apis.data.go.kr/1471000/HtfsInfoService04/getHtfsItem04?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`공공데이터 API 응답 오류: ${response.status}`);
    }

    const data = await response.json();
    const rawItems = data?.body?.items || [];

    const items = rawItems.map((item) => ({
      id: `api-${item.PRDLST_REPORT_NO || Math.random().toString(36).substr(2, 9)}`,
      name: item.PRDLST_NM || '',
      brand: item.BSSH_NM || '',
      description: item.PRIMARY_FNCLTY || '',
      rawMaterials: item.RAWMTRL_NM || '',
      intake: item.NTK_MTHD || '',
      caution: item.IFTKN_ATNT_MATR_CN || '',
      ingredients: parseIngredients(item.RAWMTRL_NM || ''),
      source: 'api',
      icon: '💊',
      category: 'vitamin',
    }));

    res.json({ items, source: 'api', total: data?.body?.totalCount || items.length });
  } catch (err) {
    console.error('건강기능식품 API 오류:', err.message);
    res.json({ items: [], source: 'error', message: err.message });
  }
});

// ─── DUR 병용금기 정보 조회 ───
app.get('/api/dur/interactions', async (req, res) => {
  const { ingredient } = req.query;

  if (!ingredient) {
    return res.status(400).json({ error: '성분명(ingredient)을 입력해주세요.' });
  }

  if (!API_KEY || API_KEY === '여기에_API_키를_입력하세요') {
    return res.json({ items: [], source: 'none' });
  }

  try {
    const params = new URLSearchParams({
      serviceKey: API_KEY,
      typeName: ingredient,
      pageNo: '1',
      numOfRows: '50',
      type: 'json',
    });

    const url = `http://apis.data.go.kr/1471000/DURIrdntInfoService03/getUsjntTabooInfoList03?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`DUR API 응답 오류: ${response.status}`);
    }

    const data = await response.json();
    const rawItems = data?.body?.items || [];

    const items = rawItems.map((item) => ({
      durType: item.DUR_TYPE || '',
      ingredientA: item.INGR_NAME || '',
      ingredientB: item.MIXTURE_INGR_NAME || '',
      prohibition: item.PROHBT_CONTENT || '',
      formulation: item.FORMULATION_NAME || '',
    }));

    res.json({ items, source: 'api' });
  } catch (err) {
    console.error('DUR API 오류:', err.message);
    res.json({ items: [], source: 'error', message: err.message });
  }
});

// ─── 개별인정형 원료 정보 ───
app.get('/api/supplements/ingredient', async (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ error: '원료명(name)을 입력해주세요.' });
  }

  if (!API_KEY || API_KEY === '여기에_API_키를_입력하세요') {
    return res.json({ items: [], source: 'none' });
  }

  try {
    const params = new URLSearchParams({
      serviceKey: API_KEY,
      rawmtrlNm: name,
      pageNo: '1',
      numOfRows: '10',
      type: 'json',
    });

    const url = `http://apis.data.go.kr/1471000/HtfsFoodInfoService/getHtfsIndvRawmtrl?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`개별인정형 API 응답 오류: ${response.status}`);
    }

    const data = await response.json();
    const rawItems = data?.body?.items || [];

    const items = rawItems.map((item) => ({
      approvalNo: item.HF_FNCLTY_MTRAL_RCOGN_NO || '',
      materialName: item.APLC_RAWMTRL_NM || '',
      functionality: item.FNCLTY_CN || '',
      dailyIntake: item.DAY_INTK_CN || '',
      caution: item.IFTKN_ATNT_MATR_CN || '',
    }));

    res.json({ items, source: 'api' });
  } catch (err) {
    console.error('개별인정형 API 오류:', err.message);
    res.json({ items: [], source: 'error', message: err.message });
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
  console.log(`\n  🏥 MediCheck API Server`);
  console.log(`  ➜ http://localhost:${PORT}`);
  console.log(`  ➜ API Key: ${API_KEY && API_KEY !== '여기에_API_키를_입력하세요' ? '✅ 설정됨' : '⚠️ .env 파일에 API 키를 설정해주세요'}\n`);
});
