const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// decodifica base58 e conta os bytes (endereco solana = 32 bytes)
function base58ByteLength(value: string) {
  let n = BigInt(0);
  for (const ch of value) n = n * BigInt(58) + BigInt(ALPHABET.indexOf(ch));
  let bytes = 0;
  while (n > BigInt(0)) {
    n >>= BigInt(8);
    bytes++;
  }
  // cada "1" no comeco vira um byte zero
  for (const ch of value) {
    if (ch !== "1") break;
    bytes++;
  }
  return bytes;
}

// endereco solana valido: base58 de exatamente 32 bytes
export function isSolanaAddress(value: string) {
  return SOLANA_ADDRESS.test(value) && base58ByteLength(value) === 32;
}

// encurta o endereco pro formato 7xKp…9fQa
export function shortAddress(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
