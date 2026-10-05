// endereco solana: base58, 32 a 44 caracteres
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isSolanaAddress(value: string) {
  return SOLANA_ADDRESS.test(value);
}

// encurta o endereco pro formato 7xKp…9fQa
export function shortAddress(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
