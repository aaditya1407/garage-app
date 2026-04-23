import * as Print from 'expo-print';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';

/**
 * Generates a Job Card HTML document and uploads it to Supabase Storage.
 * Returns the public URL of the uploaded PDF.
 */
export const generateAndUploadJobCardPDF = async (job: any): Promise<string | null> => {
  try {
    const customer = job.vehicles?.customers;
    const vehicle = job.vehicles;
    const partsLines: any[] = job.parts_lines || [];

    const partsRows = partsLines.length > 0
      ? partsLines.map((l: any) => `
          <tr>
            <td>${l.name || '—'}</td>
            <td style="text-align:right;">₹ ${Number(l.cost || 0).toLocaleString('en-IN')}</td>
          </tr>`).join('')
      : `<tr><td colspan="2" style="color:#9E9E9E;text-align:center;">No parts listed</td></tr>`;

    const complaints = (job.complaint_categories || []).join(', ') || 'None';
    const gstAmount = Math.round(Number(job.labour_cost || 0) * ((job.gst_percent || 0) / 100));
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #212121; font-size: 13px; padding: 24px; }
        .header { background: #1976D2; color: white; padding: 20px 24px; border-radius: 8px; margin-bottom: 24px; }
        .header h1 { font-size: 22px; letter-spacing: 1px; }
        .header p { font-size: 12px; margin-top: 4px; color: #BBDEFB; }
        .section { border: 1px solid #E0E0E0; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
        .section-title { background: #F5F5F5; padding: 10px 16px; font-weight: bold; color: #1976D2; font-size: 13px; border-bottom: 1px solid #E0E0E0; }
        .section-body { padding: 14px 16px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .label { color: #757575; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
        .value { font-size: 13px; font-weight: bold; }
        .col { flex: 1; margin-right: 16px; }
        .col:last-child { margin-right: 0; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #F5F5F5; font-size: 11px; color: #757575; text-transform: uppercase; padding: 8px 12px; text-align: left; border-bottom: 1px solid #E0E0E0; }
        td { padding: 8px 12px; border-bottom: 1px solid #F5F5F5; }
        .total-row { background: #E8F5E9; font-weight: bold; color: #2E7D32; }
        .total-row td { padding: 10px 12px; font-size: 14px; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; }
        .badge-pending { background: #FFF3E0; color: #E65100; }
        .badge-approved { background: #E8F5E9; color: #2E7D32; }
        .badge-rejected { background: #FFEBEE; color: #C62828; }
        .footer { text-align: center; margin-top: 24px; color: #9E9E9E; font-size: 11px; }
      </style>
    </head>
    <body>
      <!-- HEADER -->
      <div class="header">
        <h1>JOB CARD</h1>
        <p>${job.job_card_number} &nbsp;|&nbsp; Generated: ${today}</p>
      </div>

      <!-- CUSTOMER & VEHICLE -->
      <div class="section">
        <div class="section-title">Customer & Vehicle</div>
        <div class="section-body">
          <div class="row">
            <div class="col">
              <div class="label">Customer</div>
              <div class="value">${customer?.full_name || '—'}</div>
            </div>
            <div class="col">
              <div class="label">Phone</div>
              <div class="value">${customer?.phone || '—'}</div>
            </div>
          </div>
          <div class="row">
            <div class="col">
              <div class="label">Vehicle</div>
              <div class="value">${vehicle?.make || ''} ${vehicle?.model || ''}</div>
            </div>
            <div class="col">
              <div class="label">License Plate</div>
              <div class="value">${vehicle?.license_plate?.toUpperCase() || '—'}</div>
            </div>
            <div class="col">
              <div class="label">VIN</div>
              <div class="value">${vehicle?.vin || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- SERVICE DETAILS -->
      <div class="section">
        <div class="section-title">Service Details</div>
        <div class="section-body">
          <div class="row">
            <div class="col">
              <div class="label">Odometer</div>
              <div class="value">${Number(job.odometer || 0).toLocaleString('en-IN')} KM</div>
            </div>
            <div class="col">
              <div class="label">Fuel Level</div>
              <div class="value">${job.fuel_level || '—'}</div>
            </div>
            <div class="col">
              <div class="label">Bay Number</div>
              <div class="value">${job.bay_number || 'N/A'}</div>
            </div>
            <div class="col">
              <div class="label">Job Type</div>
              <div class="value">${job.job_type || '—'}</div>
            </div>
          </div>
          <div class="label" style="margin-bottom:4px;">Complaints</div>
          <div class="value" style="margin-bottom:8px;">${complaints}</div>
          ${job.description ? `<div class="label" style="margin-bottom:4px;">Description</div><div style="font-style:italic;color:#424242;">"${job.description}"</div>` : ''}
        </div>
      </div>

      <!-- PARTS & ESTIMATE -->
      <div class="section">
        <div class="section-title">Parts & Financial Estimate</div>
        <div class="section-body">
          <table>
            <thead>
              <tr>
                <th>Part / Item</th>
                <th style="text-align:right;">Cost</th>
              </tr>
            </thead>
            <tbody>
              ${partsRows}
            </tbody>
          </table>
          <table style="margin-top:12px;">
            <tbody>
              <tr><td>Parts Subtotal</td><td style="text-align:right;">₹ ${Number(job.parts_cost || 0).toLocaleString('en-IN')}</td></tr>
              <tr><td>Labour Cost</td><td style="text-align:right;">₹ ${Number(job.labour_cost || 0).toLocaleString('en-IN')}</td></tr>
              <tr><td>GST on Labour (${job.gst_percent || 0}%)</td><td style="text-align:right;">₹ ${gstAmount.toLocaleString('en-IN')}</td></tr>
              <tr class="total-row">
                <td>Estimated Total</td>
                <td style="text-align:right;">₹ ${Number(job.estimated_cost || 0).toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top:12px;text-align:right;">
            <span class="badge badge-${(job.approval_status || 'pending').toLowerCase()}">
              ${(job.approval_status || 'Pending').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      ${job.final_note ? `
      <div class="section">
        <div class="section-title">Final Completion Note</div>
        <div class="section-body">${job.final_note}</div>
      </div>` : ''}

      <div class="footer">This is a system-generated document. | Job Card: ${job.job_card_number}</div>
    </body>
    </html>`;

    // Web: can't generate PDF, skip gracefully
    if (Platform.OS === 'web') {
      console.warn('PDF generation not supported on web.');
      return null;
    }

    // Generate PDF using expo-print
    const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });

    // Read PDF as base64
    const FileSystem = await import('expo-file-system/legacy');
    const base64 = await FileSystem.default.readAsStringAsync(uri, { encoding: 'base64' });
    const { decode } = await import('base64-arraybuffer');
    const fileData = decode(base64);

    const filePath = `${job.garage_id}/${job.job_card_number}/jobcard-${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('job_cards_media')
      .upload(filePath, fileData, { contentType: 'application/pdf', upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('job_cards_media')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    console.error('PDF generation/upload failed:', err);
    return null;
  }
};
