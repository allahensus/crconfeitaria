// Generates a static Pix "Copia e Cola" payload (BR Code / EMV QRCPS-MPM,
// as defined by Banco Central). This is a pure, offline algorithm -- no
// payment gateway account or API key is needed to accept Pix this way.

function tlv(id: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

function sanitize(str: string, maxLen: number): string {
  const normalized = str.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return normalized.replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, maxLen);
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface PixChargeParams {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount?: number; // omit for an open/customer-entered amount
  txid?: string; // max 25 alphanumeric chars, shows on the payer's bank statement
}

export function generatePixPayload({ pixKey, merchantName, merchantCity, amount, txid }: PixChargeParams): string {
  const name = sanitize(merchantName, 25) || 'RECEBEDOR';
  const city = sanitize(merchantCity, 15) || 'BRASIL';
  const cleanTxid = (txid || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';

  const merchantAccountInfo = tlv('00', 'br.gov.bcb.pix') + tlv('01', pixKey.trim());

  let payload = '';
  payload += tlv('00', '01'); // Payload Format Indicator
  payload += tlv('26', merchantAccountInfo); // Merchant Account Info (Pix)
  payload += tlv('52', '0000'); // Merchant Category Code
  payload += tlv('53', '986'); // Currency: BRL
  if (amount !== undefined && amount > 0) {
    payload += tlv('54', amount.toFixed(2)); // Transaction Amount
  }
  payload += tlv('58', 'BR'); // Country Code
  payload += tlv('59', name); // Merchant Name
  payload += tlv('60', city); // Merchant City
  payload += tlv('62', tlv('05', cleanTxid)); // Additional Data: Reference Label

  const withCrcId = payload + '6304';
  return withCrcId + crc16(withCrcId);
}
