// api/supplements/detail.js — Vercel Serverless Function
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { registNo } = req.query;
  if (!registNo) {
    return res.status(400).json({ error: '신고번호(registNo)를 입력해주세요.' });
  }

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
      .from('supplements_catalog')
      .select('*')
      .eq('regist_no', registNo)
      .single();

    if (error || !data) {
      return res.json({ item: null, source: 'supabase', message: '해당 제품 없음' });
    }

    res.json({
      item: {
        name:         data.name,
        brand:        data.brand,
        registNo:     data.regist_no,
        registDate:   data.regist_date,
        mainFunction: data.main_function || '',
        intake:       data.intake || '',
        caution:      data.caution || '',
        appearance:   data.appearance || '',
        preservation: data.preservation || '',
        shelfLife:    data.shelf_life || '',
      },
      source: 'supabase',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
