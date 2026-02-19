import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const today = new Date().toISOString().split('T')[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: Record<string, any> = {
    env_check: {
      url_set: !!url,
      url_prefix: url?.substring(0, 30),
      key_set: !!key,
      key_prefix: key?.substring(0, 20),
    },
    today,
  };

  if (!url || !key) {
    return NextResponse.json({ ...results, error: 'Missing env vars' });
  }

  const supabase = createClient(url, key);

  // Test 1: Simple count
  try {
    const { count, error } = await supabase
      .from('ai_tools')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true);
    results.test1_count = { count, error: error?.message };
  } catch (e) {
    results.test1_count = { error: (e as Error).message };
  }

  // Test 2: Simple select without join
  try {
    const { data, error } = await supabase
      .from('ai_tools')
      .select('id, name, category_slug, is_published')
      .eq('is_published', true)
      .limit(3);
    results.test2_no_join = { count: data?.length, data: data?.map((d: { name: string }) => d.name), error: error?.message };
  } catch (e) {
    results.test2_no_join = { error: (e as Error).message };
  }

  // Test 3: Select with join (original syntax)
  try {
    const { data, error } = await supabase
      .from('ai_tools')
      .select('*, category:categories(*)')
      .eq('is_published', true)
      .limit(3);
    results.test3_join_original = { count: data?.length, error: error?.message, hint: error?.hint, details: error?.details };
  } catch (e) {
    results.test3_join_original = { error: (e as Error).message };
  }

  // Test 4: Select with FK hint join
  try {
    const { data, error } = await supabase
      .from('ai_tools')
      .select('*, category:categories!category_slug(*)')
      .eq('is_published', true)
      .limit(3);
    results.test4_join_fk_hint = { count: data?.length, error: error?.message, hint: error?.hint, details: error?.details };
  } catch (e) {
    results.test4_join_fk_hint = { error: (e as Error).message };
  }

  // Test 5: Today filter
  try {
    const { data, error } = await supabase
      .from('ai_tools')
      .select('id, name')
      .eq('is_published', true)
      .gte('created_at', `${today}T00:00:00`)
      .limit(3);
    results.test5_today = { count: data?.length, data: data?.map((d: { name: string }) => d.name), error: error?.message };
  } catch (e) {
    results.test5_today = { error: (e as Error).message };
  }

  // Test 6: Recent tools (no date filter)
  try {
    const { data, error } = await supabase
      .from('ai_tools')
      .select('id, name')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(3);
    results.test6_recent = { count: data?.length, data: data?.map((d: { name: string }) => d.name), error: error?.message };
  } catch (e) {
    results.test6_recent = { error: (e as Error).message };
  }

  // Test 7: Digest query
  try {
    const { data, error } = await supabase
      .from('daily_digests')
      .select('*')
      .eq('digest_date', today)
      .eq('is_published', true)
      .single();
    results.test7_digest = { found: !!data, title: data?.title, error: error?.message };
  } catch (e) {
    results.test7_digest = { error: (e as Error).message };
  }

  return NextResponse.json(results);
}
