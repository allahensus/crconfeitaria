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

export function generateWhatsAppLink(
  phone: string,
  quote: {
    quoteNumber?: string;
    customerName: string;
    productName: string;
    variation?: string;
    cakeBase?: string;
    filling1?: string;
    filling2?: string;
    frosting?: string;
    extras?: string;
    quantity: number;
    eventDate?: string;
    themeNotes?: string;
    finalTotal: number;
  }
): string {
  const cleanPhone = phone.replace(/\D/g, '');

  let text = `*SOLICITAÇÃO DE ORÇAMENTO*\n`;
  text += `*Confeitaria Cinthia Rodrigues*\n`;
  text += `---------------------------------------\n\n`;

  if (quote.quoteNumber) text += `• *Código:* ${quote.quoteNumber}\n`;
  text += `• *Cliente:* ${quote.customerName}\n`;
  text += `• *Produto:* ${quote.productName}\n`;
  if (quote.variation) text += `• *Tamanho/Fatias:* ${quote.variation}\n`;
  if (quote.cakeBase) text += `• *Massa:* ${quote.cakeBase}\n`;
  if (quote.filling1) text += `• *Recheio Principal:* ${quote.filling1}\n`;
  if (quote.filling2) text += `• *Segundo Recheio:* ${quote.filling2}\n`;
  if (quote.frosting) text += `• *Cobertura:* ${quote.frosting}\n`;
  if (quote.extras) text += `• *Adicionais:* ${quote.extras}\n`;
  text += `• *Quantidade:* ${quote.quantity}\n`;
  if (quote.eventDate) text += `• *Data Desejada:* ${quote.eventDate}\n`;
  if (quote.themeNotes) text += `• *Tema / Observações:* ${quote.themeNotes}\n`;

  text += `\n*VALOR TOTAL ESTIMADO: ${formatCurrency(quote.finalTotal)}*\n`;
  text += `---------------------------------------\n\n`;
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
