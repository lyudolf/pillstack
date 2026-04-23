// api/health.js — Vercel Serverless Function
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    const { count, error } = await supabase
      .from('supplements_catalog')
      .select('*', { count: 'exact', head: true });

    res.json({
      status: 'ok',
      apiConfigured: true,
      services: { healthFood: !error, supabase: !error },
      dbCount: count || 0,
    });
  } catch (e) {
    res.json({ status: 'ok', apiConfigured: false, services: {}, dbCount: 0 });
  }
}
