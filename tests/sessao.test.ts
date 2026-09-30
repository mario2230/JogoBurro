import { describe, expect, it } from 'vitest';
import type { Anuncio, TransporteAnfitriao, TransporteConvidado } from '../src/services/bluetooth/transporte';
import { SessaoAnfitriao } from '../src/services/sessao-anfitriao';
import { SessaoConvidado } from '../src/services/sessao-convidado';
import type { Carta, EstadoPartida, EstadoPublico } from '../src/domain/types';

// Barramento em memória: simula o anfitrião (GATT server) e N convidados (centrais).
class Barramento {
  host?: (t: string) => void;
  guests = new Set<(t: string) => void>();
}
class TAnf implements TransporteAnfitriao {
  constructor(private b: Barramento) {}
  aoReceber(cb: (t: string) => void) { this.b.host = cb; }
  async iniciar() {}
  async parar() {}
  async enviar(t: string) { queueMicrotask(() => this.b.guests.forEach((g) => g(t))); }
}
class TConv implements TransporteConvidado {
  private cb: (t: string) => void = () => undefined;
  constructor(private b: Barramento) {}
  aoReceber(cb: (t: string) => void) { this.cb = cb; }
  async procurar(_: (a: Anuncio) => void) {}
  async pararBusca() {}
  async conectar() { this.b.guests.add(this.cb); }
  async desconectar() { this.b.guests.delete(this.cb); }
  async enviar(t: string) { queueMicrotask(() => this.b.host?.(t)); }
}
const tick = () => new Promise((r) => setTimeout(r, 5));

function cenario() {
  const b = new Barramento();
  let estadoHost!: EstadoPartida;
  const pendentes: { id: string; nome: string }[][] = [];
  const encerradas: EstadoPartida[] = [];
  const host = new SessaoAnfitriao(
    new TAnf(b),
    { id: 'host', nome: 'Ana' },
    { aoMudarEstado: (e) => (estadoHost = e), aoSolicitarEntrada: (l) => pendentes.push(l), aoErro: () => {}, aoEncerrar: (e) => encerradas.push(e) },
    'partida-01',
    () => 0.999,
  );
  const convidado = (id: string, nome: string) => {
    const log = { estado: null as EstadoPublico | null, mao: [] as Carta[], erros: [] as string[] };
    const s = new SessaoConvidado(new TConv(b), { id, nome }, {
      aoMudarStatus: () => {}, aoEstado: (e) => (log.estado = e), aoMao: (m) => (log.mao = m),
      aoErro: (m) => log.erros.push(m), aoEncerrar: () => {},
    });
    return { s, log };
  };
  return { host, convidado, estado: () => estadoHost, pendentes, encerradas };
}

describe('sessão anfitrião <-> convidados (integração em memória)', () => {
  it('criação, entrada de vários jogadores, recusa e início', async () => {
    const c = cenario();
    await c.host.abrirSala();
    const bia = c.convidado('bia', 'Bia');
    const caio = c.convidado('caio', 'Caio');
    const dani = c.convidado('dani', 'Dani');

    const entrouBia = bia.s.entrar('x');
    await tick();
    expect(c.pendentes.at(-1)).toEqual([{ id: 'bia', nome: 'Bia' }]);
    c.host.aceitar('bia');
    await entrouBia;
    expect(bia.log.estado?.jogadores.map((j) => j.nome)).toEqual(['Ana', 'Bia']);

    const entrouCaio = caio.s.entrar('x');
    await tick();
    c.host.aceitar('caio');
    await entrouCaio;

    const entrouDani = dani.s.entrar('x');
    await tick();
    c.host.recusar('dani');
    await expect(entrouDani).rejects.toThrow(/recusou/);
    expect(c.estado().jogadores).toHaveLength(3);

    c.host.iniciar();
    await tick();
    expect(bia.log.estado?.fase).toBe('JOGANDO');
    // cada um recebe só a própria mão
    expect(bia.log.mao).toHaveLength(4);
    expect(bia.log.mao).toEqual(c.estado().maos.bia);
    expect(caio.log.mao).toEqual(c.estado().maos.caio);
    expect(JSON.stringify(bia.log.estado)).not.toContain('"maos"');
  });

  it('bloqueia jogada fora do turno, sincroniza a jogada válida e não vaza cartas', async () => {
    const c = cenario();
    await c.host.abrirSala();
    const bia = c.convidado('bia', 'Bia');
    const p = bia.s.entrar('x');
    await tick();
    c.host.aceitar('bia');
    await p;
    c.host.iniciar();
    await tick();

    // vez do anfitrião (índice 0): a Bia tenta jogar fora do turno
    await bia.s.jogar(bia.log.mao[0]);
    await tick();
    expect(bia.log.erros.at(-1)).toMatch(/sua vez/i);
    expect(c.estado().rodadas).toBe(0);

    // anfitrião joga; a Bia recebe a carta e passa a ser a vez dela
    const carta = c.estado().maos.host[0];
    c.host.jogar(carta);
    await tick();
    expect(bia.log.estado?.vez).toBe(1);
    expect(bia.log.mao).toHaveLength(5);
    expect(bia.log.mao).toContainEqual(carta);

    // agora a jogada da Bia é aceita e volta ao anfitrião
    await bia.s.jogar(bia.log.mao[0]);
    await tick();
    expect(c.estado().rodadas).toBe(2);
    expect(bia.log.mao).toHaveLength(4);
  });

  it('rejeita mensagens de quem não tem o token e mensagens malformadas', async () => {
    const c = cenario();
    await c.host.abrirSala();
    const bia = c.convidado('bia', 'Bia');
    const p = bia.s.entrar('x');
    await tick();
    c.host.aceitar('bia');
    await p;
    c.host.iniciar();
    const antes = JSON.stringify(c.estado());
    // injeta lixo e uma jogada com token falso direto no receptor do anfitrião
    const receber = (c.host as any).receber.bind(c.host);
    receber('lixo');
    receber(JSON.stringify({ tipo: 'JOGADA', partidaId: 'partida-01', jogadorId: 'bia', seq: 99, token: 'falso', carta: { valor: '7', naipe: 'copas' } }));
    expect(JSON.stringify(c.estado())).toBe(antes);
  });

  it('bater: fecha a mão, dá a letra e persiste no fim da partida', async () => {
    const c = cenario();
    await c.host.abrirSala();
    const bia = c.convidado('bia', 'Bia');
    const p = bia.s.entrar('x');
    await tick();
    c.host.aceitar('bia');
    await p;
    c.host.iniciar();
    await tick();

    // força uma quadra na mão do anfitrião
    const e = c.host.estado;
    c.host.estado = { ...e, maos: { ...e.maos, host: [{ valor: '7', naipe: 'copas' }, { valor: '7', naipe: 'ouros' }, { valor: '7', naipe: 'paus' }, { valor: '7', naipe: 'espadas' }] } };
    c.host.bater();
    await tick();
    expect(bia.log.estado?.fase).toBe('FIM_MAO');
    expect(bia.log.estado?.jogadores.find((j) => j.id === 'bia')?.letras).toBe(1);
  });

  it('desconexão pausa a partida e reconexão retoma com a mesma mão', async () => {
    const c = cenario();
    await c.host.abrirSala();
    const bia = c.convidado('bia', 'Bia');
    const p = bia.s.entrar('x');
    await tick();
    c.host.aceitar('bia');
    await p;
    c.host.iniciar();
    await tick();
    const maoAntes = [...bia.log.mao];

    (c.host as any).aoPerderJogador('bia');
    await tick();
    expect(bia.log.estado?.pausada).toBe(true);
    expect(c.estado().jogadores.find((j) => j.id === 'bia')?.conectado).toBe(false);

    (c.host as any).aoReconectar('bia');
    await tick();
    expect(c.estado().pausada).toBe(false);
    expect(bia.log.mao).toEqual(maoAntes);
    await c.host.fechar();
  });
});
