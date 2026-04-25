import { supabase } from '../lib/supabase';

export interface GarageInfo {
  garage_name: string;
  phone: string;
}

/**
 * Fetches the garage name and phone number from the garages table.
 * Used to stamp garage contact info on every WhatsApp notification.
 */
export const fetchGarageInfo = async (garageId: string): Promise<GarageInfo | null> => {
  try {
    const { data, error } = await supabase
      .from('garages')
      .select('garage_name, phone')
      .eq('id', garageId)
      .single();

    if (error || !data) return null;
    return data as GarageInfo;
  } catch {
    return null;
  }
};
