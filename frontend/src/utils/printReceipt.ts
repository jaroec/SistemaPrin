import { Sale } from '@/types';
import { formatCurrency, formatDateTime } from './format';

/**
 * Genera el HTML del ticket para impresión térmica
 */
export const generateReceiptHTML = (sale: Sale, exchangeRate?: number): string => {
  const seller = sale.seller_id ? 'Cajero' : 'Sistema';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ticket - ${sale.code}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
          padding: 10px;
          width: 80mm;
          background: white;
        }
        
        .header {
          text-align: center;
          margin-bottom: 15px;
          border-bottom: 2px dashed #000;
          padding-bottom: 10px;
        }
        
        .company-name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .company-info {
          font-size: 10px;
          margin-bottom: 3px;
        }
        
        .section {
          margin-bottom: 10px;
        }
        
        .section-title {
          font-weight: bold;
          margin-bottom: 5px;
          text-transform: uppercase;
        }
        
        .info-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        
        .items-table {
          width: 100%;
          margin-bottom: 10px;
        }
        
        .item-row {
          border-bottom: 1px dotted #999;
          padding: 5px 0;
        }
        
        .item-name {
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        .item-details {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }
        
        .totals {
          border-top: 2px dashed #000;
          padding-top: 10px;
          margin-top: 10px;
        }
        
        .total-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        
        .total-line.main {
          font-size: 14px;
          font-weight: bold;
          margin-top: 5px;
        }
        
        .payment-section {
          margin-top: 10px;
          border-top: 1px dashed #000;
          padding-top: 10px;
        }
        
        .footer {
          text-align: center;
          margin-top: 15px;
          border-top: 2px dashed #000;
          padding-top: 10px;
          font-size: 10px;
        }
        
        .barcode {
          text-align: center;
          font-size: 16px;
          font-weight: bold;
          margin: 10px 0;
          letter-spacing: 2px;
        }
        
        @media print {
          body {
            width: 80mm;
          }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div class="company-name">TU NEGOCIO</div>
        <div class="company-info">RIF: J-123456789</div>
        <div class="company-info">Dirección de tu negocio</div>
        <div class="company-info">Teléfono: +58 424-1234567</div>
      </div>
      
      <!-- Información de Venta -->
      <div class="section">
        <div class="section-title">Información de Venta</div>
        <div class="info-line">
          <span>Ticket:</span>
          <span><strong>${sale.code}</strong></span>
        </div>
        <div class="info-line">
          <span>Fecha:</span>
          <span>${formatDateTime(sale.created_at)}</span>
        </div>
        <div class="info-line">
          <span>Cajero:</span>
          <span>${seller}</span>
        </div>
        ${sale.client_name ? `
          <div class="info-line">
            <span>Cliente:</span>
            <span>${sale.client_name}</span>
          </div>
        ` : ''}
      </div>
      
      <!-- Items -->
      <div class="section">
        <div class="section-title">Productos</div>
        <div class="items-table">
          ${sale.details.map(item => `
            <div class="item-row">
              <div class="item-name">${item.product_name}</div>
              <div class="item-details">
                <span>${item.quantity} × ${formatCurrency(item.price_usd)}</span>
                <span>${formatCurrency(item.subtotal_usd)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Totales -->
      <div class="totals">
        <div class="total-line">
          <span>Subtotal:</span>
          <span>${formatCurrency(sale.subtotal_usd)}</span>
        </div>
        ${sale.discount_usd > 0 ? `
          <div class="total-line">
            <span>Descuento:</span>
            <span>-${formatCurrency(sale.discount_usd)}</span>
          </div>
        ` : ''}
        <div class="total-line main">
          <span>TOTAL USD:</span>
          <span>${formatCurrency(sale.total_usd)}</span>
        </div>
        ${exchangeRate ? `
          <div class="total-line" style="font-size: 11px; color: #666;">
            <span>Total Bs (Ref):</span>
            <span>Bs ${(sale.total_usd * exchangeRate).toFixed(2)}</span>
          </div>
          <div class="info-line" style="font-size: 10px; color: #999;">
            <span>Tasa: 1 USD = ${exchangeRate} Bs</span>
          </div>
        ` : ''}
      </div>
      
      <!-- Pagos -->
      ${sale.payments.length > 0 ? `
        <div class="payment-section">
          <div class="section-title">Forma de Pago</div>
          ${sale.payments.map(payment => `
            <div class="info-line">
              <span>${payment.method}:</span>
              <span>${formatCurrency(payment.amount_usd)}</span>
            </div>
            ${payment.reference ? `
              <div class="info-line" style="font-size: 10px; color: #666;">
                <span>Ref: ${payment.reference}</span>
              </div>
            ` : ''}
            ${payment.bank ? `
              <div class="info-line" style="font-size: 10px; color: #666;">
                <span>Banco: ${payment.bank}</span>
              </div>
            ` : ''}
            ${payment.change_usd && payment.change_usd > 0 ? `
              <div class="info-line" style="font-size: 11px; color: #333;">
                <span>Cambio USD:</span>
                <span>${formatCurrency(payment.change_usd)}</span>
              </div>
            ` : ''}
            ${payment.change_secondary && payment.change_secondary > 0 ? `
              <div class="info-line" style="font-size: 11px; color: #333;">
                <span>Cambio Bs:</span>
                <span>Bs ${payment.change_secondary.toFixed(2)}</span>
              </div>
            ` : ''}
          `).join('<div style="height: 5px;"></div>')}
        </div>
      ` : ''}
      
      <!-- Estado -->
      <div class="section">
        <div class="info-line">
          <span>Pagado:</span>
          <span>${formatCurrency(sale.paid_usd)}</span>
        </div>
        ${sale.balance_usd > 0 ? `
          <div class="info-line" style="color: #d97706;">
            <span><strong>Pendiente:</strong></span>
            <span><strong>${formatCurrency(sale.balance_usd)}</strong></span>
          </div>
        ` : ''}
        <div class="info-line">
          <span>Estado:</span>
          <span><strong>${sale.status}</strong></span>
        </div>
      </div>
      
      <!-- Código de Barras (simulado) -->
      <div class="barcode">
        |||  ${sale.code}  |||
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <div>¡Gracias por su compra!</div>
        <div>Conserve este ticket</div>
        <div style="margin-top: 10px;">
          Sistema POS - www.tunegocio.com
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Imprime un ticket de venta
 */
export const printReceipt = (sale: Sale, exchangeRate?: number): void => {
  try {
    // Crear ventana de impresión
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes para imprimir');
      return;
    }

    // Generar HTML
    const html = generateReceiptHTML(sale, exchangeRate);
    
    // Escribir contenido
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Esperar a que cargue y ejecutar impresión
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Cerrar ventana después de imprimir
        setTimeout(() => {
          printWindow.close();
        }, 100);
      }, 250);
    };
    
  } catch (error) {
    console.error('Error al imprimir:', error);
    alert('Error al generar el ticket de impresión');
  }
};

/**
 * Descarga el ticket como HTML
 */
export const downloadReceipt = (sale: Sale, exchangeRate?: number): void => {
  try {
    const html = generateReceiptHTML(sale, exchangeRate);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${sale.code}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error al descargar:', error);
    alert('Error al descargar el ticket');
  }
};
