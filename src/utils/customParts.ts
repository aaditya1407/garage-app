import { supabase } from '../lib/supabase';

/**
 * Fetch all custom parts saved by this garage.
 * Returns a sorted, deduplicated list of part names.
 */
export async function fetchCustomParts(garageId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('custom_parts')
    .select('part_name')
    .eq('garage_id', garageId)
    .order('part_name', { ascending: true });

  if (error) {
    console.warn('Failed to fetch custom parts:', error.message);
    return [];
  }

  // Deduplicate (in case of race conditions)
  return [...new Set((data || []).map(d => d.part_name))];
}

/**
 * Save a new custom part for a garage.
 * Silently skips if the part already exists (upsert-like via check).
 */
export async function saveCustomPart(garageId: string, partName: string): Promise<void> {
  const trimmed = partName.trim();
  if (!trimmed || !garageId) return;

  // Check if it already exists to avoid duplicates
  const { data: existing } = await supabase
    .from('custom_parts')
    .select('id')
    .eq('garage_id', garageId)
    .ilike('part_name', trimmed)
    .maybeSingle();

  if (existing) return; // Already saved

  const { error } = await supabase
    .from('custom_parts')
    .insert({ garage_id: garageId, part_name: trimmed });

  if (error) {
    console.warn('Failed to save custom part:', error.message);
  }
}
