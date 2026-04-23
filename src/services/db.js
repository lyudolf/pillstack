// ═══════════════════════════════════════════
// Supabase DB Service — supplements & analysis
// ═══════════════════════════════════════════

import { supabase } from '../lib/supabase.js';

// ─── Supplements ───

export async function fetchSupplements(userId) {
  const { data, error } = await supabase
    .from('user_supplements')
    .select('supplement_data')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(row => row.supplement_data);
}

export async function insertSupplement(userId, supplement) {
  const { error } = await supabase
    .from('user_supplements')
    .insert({
      user_id: userId,
      supplement_id: supplement.id,
      supplement_data: supplement,
    });

  if (error) throw error;
}

export async function deleteSupplement(userId, supplementId) {
  const { error } = await supabase
    .from('user_supplements')
    .delete()
    .eq('user_id', userId)
    .eq('supplement_id', supplementId);

  if (error) throw error;
}

// ─── Analysis ───

export async function fetchAnalysis(userId) {
  const { data, error } = await supabase
    .from('analysis_results')
    .select('result_data, timing_data')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data || null;
}

export async function upsertAnalysis(userId, resultData, timingData) {
  // 기존 row가 있으면 update, 없으면 insert
  const { data: existing } = await supabase
    .from('analysis_results')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('analysis_results')
      .update({
        result_data: resultData,
        timing_data: timingData,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('analysis_results')
      .insert({
        user_id: userId,
        result_data: resultData,
        timing_data: timingData,
      });
    if (error) throw error;
  }
}

export async function deleteAnalysis(userId) {
  const { error } = await supabase
    .from('analysis_results')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}
