import { supabase } from '../lib/supabase';

export interface WhatsAppTemplateParams {
  name: 'job_created_template' | 'status_update_template' | 'job_completed_template' | 'invoice_generated_template';
  variables: string[];
  documentUrl?: string; // Only for job_created_template and invoice_generated_template
  documentFileName?: string;
}

/**
 * Formats a phone number for MSG91 (Indian 10-digit -> 91XXXXXXXXXX)
 */
export const formatIndianPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return `91${cleaned}`;
  if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned;
  return cleaned;
};

/**
 * Validates a phone number before attempting to send.
 */
export const validatePhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || (cleaned.startsWith('91') && cleaned.length === 12);
};

/**
 * Sends a WhatsApp message by calling our secure Supabase Edge Function.
 * This completely bypasses Web CORS issues by executing on the server!
 */
export const sendMsg91WhatsApp = async (
  phone: string,
  params: WhatsAppTemplateParams
): Promise<boolean> => {
  
  if (!validatePhoneNumber(phone)) {
    console.warn(`[WhatsApp] Invalid phone number: "${phone}". Skipping notification.`);
    return false;
  }

  const formattedPhone = formatIndianPhoneNumber(phone);

  try {
    // Invoke our custom Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('msg91-whatsapp', {
      body: {
        phone: formattedPhone,
        params: params
      }
    });

    if (error) {
      throw new Error(error.message || 'Edge Function failed');
    }

    if (data?.error) {
       throw new Error(data.error);
    }

    console.log(`[WhatsApp] Sent "${params.name}" to ${formattedPhone} via Edge Function`, data);
    return true;

  } catch (error) {
    console.error('[WhatsApp] Edge Function API Error:', error);
    return false;
  }
};
