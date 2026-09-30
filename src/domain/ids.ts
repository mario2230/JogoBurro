/** Id curto (8 caracteres) para manter as mensagens Bluetooth pequenas. */
export function gerarId(tamanho = 8): string {
  const alfabeto = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(tamanho);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
}
