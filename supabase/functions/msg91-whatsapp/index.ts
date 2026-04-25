import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, params } = await req.json()
    
    // Retrieve credentials from Supabase Edge Function Secrets
    const authKey = Deno.env.get('MSG91_AUTH_KEY');
    const integratedNumber = Deno.env.get('MSG91_INTEGRATED_NUMBER');

    if (!authKey || !integratedNumber) {
      throw new Error("MSG91_AUTH_KEY or MSG91_INTEGRATED_NUMBER secret is missing.");
    }

    if (!phone || !params || !params.name || !params.variables) {
      throw new Error("Missing required parameters: phone or template params.");
    }

    // Build the components array for the template
    const components: any[] = [];

    // Add document header if provided (for templates with PDF attachments)
    if (['job_created_template', 'invoice_generated_template'].includes(params.name) && params.documentUrl) {
      components.push({
        type: 'header',
        parameters: [
          {
            type: 'document',
            document: {
              link: params.documentUrl,
              filename: params.documentFileName || 'Document.pdf',
            },
          },
        ],
      });
    }

    // Add body text variables
    components.push({
      type: 'body',
      parameters: params.variables.map((val: any) => ({
        type: 'text',
        text: String(val),
      })),
    });

    const payload = {
      'integrated-number': integratedNumber,
      'integrated_number': integratedNumber,
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
          name: params.name,
          language: { code: 'en' },
          components,
        },
      },
    };

    // Make the secure HTTP request to MSG91 from the server
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
      throw new Error(`MSG91 Error: ${JSON.stringify(data)}`);
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );
  }
});
