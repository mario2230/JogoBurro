// BLE só garante 20 bytes por pacote (MTU padrão 23 - 3). Mensagens JSON maiores são
// quebradas em fragmentos:  [tag][msgId][indice][total][...16 bytes de dados]
// tag = byte aleatório do remetente (o anfitrião não sabe qual convidado escreveu, então
// a tag evita misturar fragmentos de remetentes diferentes).

export const TAMANHO_PACOTE = 20;
export const TAMANHO_CABECALHO = 4;
export const TAMANHO_DADOS = TAMANHO_PACOTE - TAMANHO_CABECALHO;
export const MAX_FRAGMENTOS = 255;

const enc = new TextEncoder();
const dec = new TextDecoder();

export function fragmentar(texto: string, tag: number, msgId: number): Uint8Array[] {
  const bytes = enc.encode(texto);
  const total = Math.max(1, Math.ceil(bytes.length / TAMANHO_DADOS));
  if (total > MAX_FRAGMENTOS) throw new Error('Mensagem grande demais para o Bluetooth.');
  const pacotes: Uint8Array[] = [];
  for (let i = 0; i < total; i++) {
    const parte = bytes.slice(i * TAMANHO_DADOS, (i + 1) * TAMANHO_DADOS);
    const pacote = new Uint8Array(TAMANHO_CABECALHO + parte.length);
    pacote.set([tag & 0xff, msgId & 0xff, i, total], 0);
    pacote.set(parte, TAMANHO_CABECALHO);
    pacotes.push(pacote);
  }
  return pacotes;
}

interface Pendente {
  total: number;
  partes: Map<number, Uint8Array>;
  criadoEm: number;
}

export class Remontador {
  private pendentes = new Map<string, Pendente>();

  constructor(private validadeMs = 10_000, private agora: () => number = () => Date.now()) {}

  /** Recebe um pacote. Retorna o texto completo quando o último fragmento chega, senão null. */
  receber(pacote: Uint8Array): string | null {
    if (pacote.length < TAMANHO_CABECALHO) return null;
    const [tag, msgId, indice, total] = pacote;
    if (total === 0 || indice >= total) return null;
    this.limparAntigos();
    const chave = `${tag}:${msgId}`;
    let p = this.pendentes.get(chave);
    if (!p || p.total !== total) {
      p = { total, partes: new Map(), criadoEm: this.agora() };
      this.pendentes.set(chave, p);
    }
    p.partes.set(indice, pacote.slice(TAMANHO_CABECALHO));
    if (p.partes.size < total) return null;
    this.pendentes.delete(chave);
    const tamanho = [...p.partes.values()].reduce((s, x) => s + x.length, 0);
    const junto = new Uint8Array(tamanho);
    let off = 0;
    for (let i = 0; i < total; i++) {
      const parte = p.partes.get(i)!;
      junto.set(parte, off);
      off += parte.length;
    }
    return dec.decode(junto);
  }

  private limparAntigos() {
    const agora = this.agora();
    for (const [k, p] of this.pendentes) if (agora - p.criadoEm > this.validadeMs) this.pendentes.delete(k);
  }
}
