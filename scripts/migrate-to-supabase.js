// ═══════════════════════════════════════════
// 마이그레이션: supplements-db.json → Supabase
// node scripts/migrate-to-supabase.js
// ═══════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ENV 직접 로드 (.env 파일)
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const [k, ...v] = l.split('=');
      return [k.trim(), v.join('=').trim()];
    })
);

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;
const BATCH_SIZE  = 500;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 없음');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// JSON 로드
const raw = JSON.parse(readFileSync(resolve(__dirname, '../data/supplements-db.json'), 'utf8'));
const items = raw.items;
console.log(`✅ 총 ${items.length.toLocaleString()}건 로드 완료`);

// 필드 매핑
function mapItem(item) {
  return {
    name:          item.name        || null,
    brand:         item.brand       || null,
    regist_no:     item.registNo    || null,
    regist_date:   item.registDate  || null,
    main_function: item.mainFunction|| null,
    intake:        item.intake      || null,
    caution:       item.caution     || null,
    appearance:    item.appearance  || null,
    preservation:  item.preservation|| null,
    shelf_life:    item.shelfLife   || null,
  };
}

// 배치 업로드
async function migrate() {
  const total = items.length;
  let success = 0;
  let failed  = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE).map(mapItem);
    const { error } = await supabase
      .from('supplements_catalog')
      .insert(batch);

    if (error) {
      console.error(`❌ 배치 ${i}~${i + batch.length} 실패:`, error.message);
      failed += batch.length;
    } else {
      success += batch.length;
      const pct = Math.round((success / total) * 100);
      process.stdout.write(`\r진행: ${success.toLocaleString()} / ${total.toLocaleString()} (${pct}%)`);
    }
  }

  console.log(`\n\n🎉 완료! 성공: ${success.toLocaleString()}, 실패: ${failed}`);
}

migrate().catch(console.error);
