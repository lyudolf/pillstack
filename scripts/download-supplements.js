// ═══════════════════════════════════════════
// 건강기능식품 전체 데이터 다운로드 (상세 필드 포함)
// getHtfsItem01 API → supplements-db.json
// 실행: node scripts/download-supplements.js
// ═══════════════════════════════════════════

import 'dotenv/config';
import { writeFileSync } from 'fs';

const KEY = process.env.PUBLIC_DATA_API_KEY;
const PAGE_SIZE = 500;
const PARALLEL = 5;
const OUTPUT = 'data/supplements-db.json';

// 상세 API 엔드포인트 (목록 API보다 필드가 많음)
const API_URL = 'http://apis.data.go.kr/1471000/HtfsInfoService03/getHtfsItem01';

if (!KEY || KEY.includes('여기에')) {
  console.error('❌ .env에 PUBLIC_DATA_API_KEY를 설정해주세요.');
  process.exit(1);
}

console.log('📦 건강기능식품 상세 데이터 다운로드 시작...');
console.log('   엔드포인트: getHtfsItem01 (상세 필드 포함)\n');

// 1단계: 총 건수 확인
const probe = await fetch(
  `${API_URL}?serviceKey=${KEY}&pageNo=1&numOfRows=1&type=json`
);
const probeData = await probe.json();
const totalCount = probeData?.body?.totalCount || 0;
const totalPages = Math.ceil(totalCount / PAGE_SIZE);

console.log(`  총 ${totalCount.toLocaleString()}건, ${totalPages}페이지 (${PAGE_SIZE}건/페이지)`);
console.log(`  API 호출 횟수: ~${totalPages}회 (일반인증키 한도 1,000회 이내)\n`);

// 2단계: 병렬 다운로드
const start = Date.now();
const allItems = [];
let downloaded = 0;
let apiCalls = 1; // probe 포함

for (let batch = 0; batch < totalPages; batch += PARALLEL) {
  const promises = [];
  for (let i = 0; i < PARALLEL && (batch + i) < totalPages; i++) {
    const page = batch + i + 1;
    apiCalls++;
    promises.push(
      fetch(`${API_URL}?serviceKey=${KEY}&pageNo=${page}&numOfRows=${PAGE_SIZE}&type=json`)
        .then(r => r.json())
        .then(d => {
          const items = (d?.body?.items || []).map(wrapper => {
            const item = wrapper.item || wrapper;
            return {
              name: (item.PRDUCT || '').trim(),
              brand: (item.ENTRPS || '').trim(),
              registNo: item.STTEMNT_NO || '',
              registDate: item.REGIST_DT || '',
              // 상세 필드
              mainFunction: (item.MAIN_FNCTN || '').trim(),
              intake: (item.SRV_USE || '').trim(),
              caution: (item.INTAKE_HINT1 || '').trim(),
              appearance: (item.SUNGSANG || '').trim(),
              preservation: (item.PRSRV_PD || '').trim(),
              shelfLife: (item.DISTB_PD || '').trim(),
            };
          });
          return items;
        })
        .catch(err => {
          console.warn(`  ⚠️ 페이지 ${page} 실패: ${err.message}`);
          return [];
        })
    );
  }

  const results = await Promise.all(promises);
  for (const items of results) {
    allItems.push(...items);
    downloaded += items.length;
  }

  const pct = Math.min(100, Math.round((downloaded / totalCount) * 100));
  const elapsed = ((Date.now() - start) / 1000).toFixed(0);
  process.stdout.write(`\r  ⏳ ${downloaded.toLocaleString()} / ${totalCount.toLocaleString()}건 (${pct}%) — ${elapsed}초`);
}

console.log('\n');

// 3단계: 빈 이름 필터링 + 중복 제거
const cleaned = allItems.filter(item => item.name.length > 0);
const unique = [...new Map(cleaned.map(item => [item.registNo, item])).values()];

// 상세 필드 통계
const withFunction = unique.filter(i => i.mainFunction).length;
const withIntake = unique.filter(i => i.intake).length;
const withCaution = unique.filter(i => i.caution).length;

console.log(`  정리: ${allItems.length}건 → ${unique.length}건 (빈값/중복 제거)`);
console.log(`  상세 필드 보유율:`);
console.log(`    기능성: ${withFunction.toLocaleString()}건 (${(withFunction/unique.length*100).toFixed(1)}%)`);
console.log(`    섭취방법: ${withIntake.toLocaleString()}건 (${(withIntake/unique.length*100).toFixed(1)}%)`);
console.log(`    주의사항: ${withCaution.toLocaleString()}건 (${(withCaution/unique.length*100).toFixed(1)}%)\n`);

// 4단계: JSON 저장
const db = {
  version: new Date().toISOString().split('T')[0],
  totalCount: unique.length,
  source: '식품의약품안전처 건강기능식품정보 (data.go.kr)',
  apiEndpoint: 'getHtfsItem01',
  includesDetail: true,
  items: unique,
};

writeFileSync(OUTPUT, JSON.stringify(db), 'utf-8');

const fileSizeMB = (Buffer.byteLength(JSON.stringify(db)) / 1024 / 1024).toFixed(1);
const totalTime = ((Date.now() - start) / 1000).toFixed(1);

console.log(`  💾 ${OUTPUT} 저장 완료 (${fileSizeMB}MB)`);
console.log(`  📡 API 호출 총 ${apiCalls}회`);
console.log(`\n✅ 완료! ${unique.length.toLocaleString()}건 (상세 포함), ${totalTime}초 소요\n`);
