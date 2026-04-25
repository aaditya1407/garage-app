import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export interface InvoiceData {
  garageName: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerPhone: string;
  vehicleMake: string;
  vehicleModel: string;
  licensePlate: string;
  jobCardNumber: string;
  partsLines: { name: string; cost: number }[];
  miscLines: { name: string; cost: number }[];
  partsTotal: number;
  labourTotal: number;
  miscTotal: number;
  cgstAmount: number;
  sgstAmount: number;
  discount: number;
  grandTotal: number;
  paymentMode: string;
}

export const generateInvoicePDF = async (data: InvoiceData) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${data.invoiceNumber}</title>
      <style>
        body { font-family: 'Helvetica Neue', 'Helvetica', sans-serif; color: #333; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #1976D2; }
        .header p { margin: 5px 0 0; color: #666; }
        .row { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .column { flex: 1; }
        .section-title { font-weight: bold; border-bottom: 1px solid #ccc; margin-bottom: 10px; padding-bottom: 5px; color: #455A64; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; color: #333; }
        .text-right { text-align: right; }
        .totals-table { width: 50%; float: right; margin-bottom: 40px; }
        .totals-table th, .totals-table td { border-bottom: none; padding: 5px 8px; }
        .totals-table .grand-total { font-size: 1.2em; font-weight: bold; border-top: 2px solid #333; color: #1565C0; }
        .footer { text-align: center; margin-top: 50px; font-size: 0.9em; color: #777; clear: both; }
        .badge { background-color: #E8F5E9; color: #2E7D32; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${data.garageName || 'Garage Manager'}</h1>
        <p>TAX INVOICE</p>
      </div>
      
      <div class="row">
        <div class="column">
          <div class="section-title">Bill To</div>
          <p><strong>${data.customerName}</strong><br>
          Phone: ${data.customerPhone}</p>
        </div>
        <div class="column text-right">
          <p><strong>Invoice No:</strong> ${data.invoiceNumber}<br>
          <strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}<br>
          <strong>Job Card:</strong> ${data.jobCardNumber}</p>
          <p><span class="badge">Payment: ${data.paymentMode}</span></p>
        </div>
      </div>
      
      <div class="row">
        <div class="column">
          <div class="section-title">Vehicle Details</div>
          <p>${data.vehicleMake} ${data.vehicleModel}<br>
          Reg: <strong>${data.licensePlate}</strong></p>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="text-right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${data.partsLines.map(p => `
            <tr>
              <td>${p.name} (Part)</td>
              <td class="text-right">${Number(p.cost).toFixed(2)}</td>
            </tr>
          `).join('')}
          ${data.miscLines.map(m => `
            <tr>
              <td>${m.name} (Misc)</td>
              <td class="text-right">${Number(m.cost).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr>
            <td>Labour Charges</td>
            <td class="text-right">${Number(data.labourTotal).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      
      <table class="totals-table">
        <tr>
          <td>Subtotal (Parts & Misc)</td>
          <td class="text-right">₹${Number(data.partsTotal + data.miscTotal).toFixed(2)}</td>
        </tr>
        <tr>
          <td>Labour Total</td>
          <td class="text-right">₹${Number(data.labourTotal).toFixed(2)}</td>
        </tr>
        <tr>
          <td>CGST (Labour)</td>
          <td class="text-right">₹${Number(data.cgstAmount).toFixed(2)}</td>
        </tr>
        <tr>
          <td>SGST (Labour)</td>
          <td class="text-right">₹${Number(data.sgstAmount).toFixed(2)}</td>
        </tr>
        ${data.discount > 0 ? `
        <tr>
          <td style="color: #D32F2F;">Discount Applied</td>
          <td class="text-right" style="color: #D32F2F;">-₹${Number(data.discount).toFixed(2)}</td>
        </tr>
        ` : ''}
        <tr class="grand-total">
          <td>Grand Total</td>
          <td class="text-right">₹${Number(data.grandTotal).toFixed(2)}</td>
        </tr>
      </table>
      
      <div class="footer">
        <p>Thank you for your business!</p>
        <p><small>This is a computer generated invoice.</small></p>
      </div>
    </body>
    </html>
  `;

  try {
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      } else {
        window.alert('Please allow popups for this site to view and print invoices.');
      }
      return '';
    }

    const { uri } = await Print.printToFileAsync({ html: htmlContent });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Share Invoice' });
    } else {
      console.log('Sharing is not available on this platform. PDF saved to:', uri);
    }
    
    return uri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Generates an Invoice PDF and uploads it to Supabase Storage.
 * Returns the public URL of the uploaded PDF for WhatsApp attachment.
 */
export const generateAndUploadInvoicePDF = async (data: InvoiceData, garageId: string): Promise<string | null> => {
  // Use the exact same HTML content as above
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${data.invoiceNumber}</title>
      <style>
        body { font-family: 'Helvetica Neue', 'Helvetica', sans-serif; color: #333; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #1976D2; }
        .header p { margin: 5px 0 0; color: #666; }
        .row { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .column { flex: 1; }
        .section-title { font-weight: bold; border-bottom: 1px solid #ccc; margin-bottom: 10px; padding-bottom: 5px; color: #455A64; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; color: #333; }
        .text-right { text-align: right; }
        .totals-table { width: 50%; float: right; margin-bottom: 40px; }
        .totals-table th, .totals-table td { border-bottom: none; padding: 5px 8px; }
        .totals-table .grand-total { font-size: 1.2em; font-weight: bold; border-top: 2px solid #333; color: #1565C0; }
        .footer { text-align: center; margin-top: 50px; font-size: 0.9em; color: #777; clear: both; }
        .badge { background-color: #E8F5E9; color: #2E7D32; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${data.garageName || 'Garage Manager'}</h1>
        <p>TAX INVOICE</p>
      </div>
      
      <div class="row">
        <div class="column">
          <div class="section-title">Bill To</div>
          <p><strong>${data.customerName}</strong><br>
          Phone: ${data.customerPhone}</p>
        </div>
        <div class="column text-right">
          <p><strong>Invoice No:</strong> ${data.invoiceNumber}<br>
          <strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}<br>
          <strong>Job Card:</strong> ${data.jobCardNumber}</p>
          <p><span class="badge">Payment: ${data.paymentMode}</span></p>
        </div>
      </div>
      
      <div class="row">
        <div class="column">
          <div class="section-title">Vehicle Details</div>
          <p>${data.vehicleMake} ${data.vehicleModel}<br>
          Reg: <strong>${data.licensePlate}</strong></p>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="text-right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${data.partsLines.map(p => `
            <tr>
              <td>${p.name} (Part)</td>
              <td class="text-right">${Number(p.cost).toFixed(2)}</td>
            </tr>
          `).join('')}
          ${data.miscLines.map(m => `
            <tr>
              <td>${m.name} (Misc)</td>
              <td class="text-right">${Number(m.cost).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr>
            <td>Labour Charges</td>
            <td class="text-right">${Number(data.labourTotal).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      
      <table class="totals-table">
        <tr>
          <td>Subtotal (Parts & Misc)</td>
          <td class="text-right">₹${Number(data.partsTotal + data.miscTotal).toFixed(2)}</td>
        </tr>
        <tr>
          <td>Labour Total</td>
          <td class="text-right">₹${Number(data.labourTotal).toFixed(2)}</td>
        </tr>
        <tr>
          <td>CGST (Labour)</td>
          <td class="text-right">₹${Number(data.cgstAmount).toFixed(2)}</td>
        </tr>
        <tr>
          <td>SGST (Labour)</td>
          <td class="text-right">₹${Number(data.sgstAmount).toFixed(2)}</td>
        </tr>
        ${data.discount > 0 ? `
        <tr>
          <td style="color: #D32F2F;">Discount Applied</td>
          <td class="text-right" style="color: #D32F2F;">-₹${Number(data.discount).toFixed(2)}</td>
        </tr>
        ` : ''}
        <tr class="grand-total">
          <td>Grand Total</td>
          <td class="text-right">₹${Number(data.grandTotal).toFixed(2)}</td>
        </tr>
      </table>
      
      <div class="footer">
        <p>Thank you for your business!</p>
        <p><small>This is a computer generated invoice.</small></p>
      </div>
    </body>
    </html>
  `;

  try {
    let fileData: ArrayBuffer;

    if (Platform.OS === 'web') {
      const base64Pdf = await new Promise<string>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = async () => {
          try {
            const worker = (window as any).html2pdf().set({
              margin: [10, 10],
              filename: 'invoice.pdf',
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true, logging: true },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).from(htmlContent).output('datauristring');
            
            const base64Uri = await worker;
            resolve(base64Uri.split(',')[1]);
          } catch (e) {
            reject(e);
          }
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });

      const { decode } = await import('base64-arraybuffer');
      fileData = decode(base64Pdf);
    } else {
      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
      const FileSystem = await import('expo-file-system/legacy');
      const base64 = await FileSystem.default.readAsStringAsync(uri, { encoding: 'base64' });
      const { decode } = await import('base64-arraybuffer');
      fileData = decode(base64);
    }

    const { supabase } = await import('../lib/supabase');
    const filePath = `${garageId}/invoices/${data.invoiceNumber}-${Date.now()}.pdf`;
    
    const { error: uploadError } = await supabase.storage
      .from('job_cards_media')
      .upload(filePath, fileData, { contentType: 'application/pdf', upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('job_cards_media')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    console.error('Invoice PDF generation/upload failed:', err);
    return null;
  }
};
