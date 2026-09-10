import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return 'N/A';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return 'N/A';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatWhatsappForUrl(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 || digits.length === 11) {
    digits = '55' + digits;
  }
  return digits;
}

// Semi-automatic, not automatic: the confeiteira clicks this after marking
// an order ENTREGUE, WhatsApp opens with the message already written, she
// reviews and sends. Building real automatic sending needs the WhatsApp
// Business API (cost + Meta approval), deliberately out of scope for now.
export function generateReviewRequestLink(
  phone: string,
  customerName: string,
  bakeryName: string,
  reviewUrl: string
): string {
  const cleanPhone = formatWhatsappForUrl(phone);
  const firstName = (customerName || '').trim().split(' ')[0] || 'você';

  let text = `😍 Oi, ${firstName}! Esperamos que tenha amado seu pedido da *${bakeryName}*!\n\n`;
  text += `Você poderia deixar uma avaliação rapidinha pra gente? Ajuda muito outras pessoas a conhecerem nosso trabalho! 🙏\n\n`;
  text += `${reviewUrl}`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export function generateWhatsAppLink(
  phone: string,
  quote: {
    quoteNumber?: string;
    customerName: string;
    productName: string;
    variation?: string;
    isBiscoito?: boolean;
    cakeBase?: string;
    filling1?: string;
    frosting?: string;
    extras?: string;
    quantity: number;
    eventDate?: string;
    themeNotes?: string;
    finalTotal: number;
    depositAmount?: number;
  }
): string {
  const cleanPhone = formatWhatsappForUrl(phone);
  const divider = '━━━━━━━━━━━━━━━━━━━━━';

  let text = `🎂 *SOLICITAÇÃO DE ORÇAMENTO*\n`;
  text += `*Confeitaria Cinthia Rodrigues*\n`;
  text += `${divider}\n\n`;

  if (quote.quoteNumber) text += `Código: *${quote.quoteNumber}*\n\n`;

  text += `📦 *Pedido*\n`;
  text += `• Produto: ${quote.productName}\n`;
  if (quote.variation) text += `• ${quote.isBiscoito ? 'Tamanho' : 'Tamanho/Fatias'}: ${quote.variation}\n`;
  if (quote.cakeBase) text += `• Massa: ${quote.cakeBase}\n`;
  if (quote.filling1) text += `• Recheio Principal: ${quote.filling1}\n`;
  // Skip this line when the variation name already says it (e.g. "Cobertura em
  // Buttercream" as a Mini Bolo size option) -- otherwise it repeats itself.
  if (quote.frosting && !(quote.variation && quote.variation.includes(quote.frosting))) {
    text += `• Cobertura: ${quote.frosting}\n`;
  }
  text += `• Quantidade: ${quote.quantity}\n`;
  if (quote.extras) {
    for (const part of quote.extras.split('|').map((p) => p.trim()).filter(Boolean)) {
      text += `• ${part}\n`;
    }
  }

  text += `\n👤 *Cliente*\n`;
  text += `• Nome: ${quote.customerName}\n`;
  if (quote.eventDate) text += `• Data Desejada: ${quote.eventDate}\n`;
  if (quote.themeNotes) text += `• Observações: ${quote.themeNotes}\n`;

  text += `\n${divider}\n`;
  text += `💰 *VALOR TOTAL ESTIMADO: ${formatCurrency(quote.finalTotal)}*\n`;
  if (quote.depositAmount) {
    text += `✅ *Sinal para reservar a data: ${formatCurrency(quote.depositAmount)}*\n`;
  }
  text += `${divider}\n\n`;
  text += `_Aguardo sua confirmação para combinarmos os detalhes e a data!_`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}
