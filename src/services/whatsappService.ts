export interface WhatsAppTemplateParams {
  name: 'job_created_template' | 'status_update_template' | 'job_completed_template';
  variables: string[];
  documentUrl?: string; // Only for job_created_template (PDF)
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
 * Sends a WhatsApp message via MSG91's Outbound API.
 * Supports 3 templates:
 *   1. job_created_template  – with optional PDF document header
 *   2. status_update_template – plain body only
 *   3. job_completed_template – plain body only
 */
export const sendMsg91WhatsApp = async (
  phone: string,
  params: WhatsAppTemplateParams
): Promise<boolean> => {
  const authKey = process.env.EXPO_PUBLIC_MSG91_AUTH_KEY;
  const integratedNumber = process.env.EXPO_PUBLIC_MSG91_INTEGRATED_NUMBER;

  if (!authKey || authKey === 'your_msg91_auth_key') {
    console.warn('[WhatsApp] MSG91 Auth Key not configured. Skipping notification.');
    return false;
  }

  if (!validatePhoneNumber(phone)) {
    console.warn(`[WhatsApp] Invalid phone number: "${phone}". Skipping notification.`);
    return false;
  }

  const formattedPhone = formatIndianPhoneNumber(phone);

  // Build components array
  const components: any[] = [];

  // Add document header for job_created_template (PDF)
  if (params.name === 'job_created_template' && params.documentUrl) {
    components.push({
      type: 'header',
      parameters: [
        {
          type: 'document',
          document: {
            link: params.documentUrl,
            filename: params.documentFileName || 'JobCard.pdf',
          },
        },
      ],
    });
  }

  // Add body parameters
  components.push({
    type: 'body',
    parameters: params.variables.map(val => ({
      type: 'text',
      text: String(val),
    })),
  });

  const payload = {
    'integrated-number': integratedNumber,
    content_type: 'template',
    payload: {
      to: formattedPhone,
      type: 'template',
      template: {
        name: params.name,
        language: { code: 'en' },
        components,
      },
    },
  };

  try {
    const response = await fetch(
      'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: authKey,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `MSG91 returned ${response.status}`);
    }

    console.log(`[WhatsApp] Sent "${params.name}" to ${formattedPhone}`, data);
    return true;
  } catch (error) {
    console.error('[WhatsApp] API Error:', error);
    return false;
  }
};
