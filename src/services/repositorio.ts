import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { RegistroPartida } from '@/domain/types';

export interface RepositorioHistorico {
  salvar(r: RegistroPartida): Promise<void>;
  listar(): Promise<RegistroPartida[]>;
  obter(id: string): Promise<RegistroPartida | null>;
  excluir(id: string): Promise<void>;
  limpar(): Promise<void>;
}

// ---------------- SQLite (Android/iOS) ----------------
const NOME_BANCO = 'burro';
const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS partidas (
  id TEXT PRIMARY KEY,
  inicio TEXT NOT NULL,
  fim TEXT NOT NULL,
  status TEXT NOT NULL,
  motivo TEXT NOT NULL,
  rodadas INTEGER NOT NULL,
  maos INTEGER NOT NULL,
  vencedor_id TEXT,
  penalizado_id TEXT,
  jogador_local_id TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS participantes (
  partida_id TEXT NOT NULL,
  jogador_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  posicao INTEGER NOT NULL,
  letras INTEGER NOT NULL,
  vitorias INTEGER NOT NULL,
  PRIMARY KEY (partida_id, jogador_id),
  FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE
);`;

class RepositorioSqlite implements RepositorioHistorico {
  private db: Promise<SQLiteDBConnection> | null = null;

  private abrir(): Promise<SQLiteDBConnection> {
    if (!this.db) {
      this.db = (async () => {
        const sqlite = new SQLiteConnection(CapacitorSQLite);
        const consistente = (await sqlite.checkConnectionsConsistency()).result;
        const existe = (await sqlite.isConnection(NOME_BANCO, false)).result;
        const conn =
          consistente && existe
            ? await sqlite.retrieveConnection(NOME_BANCO, false)
            : await sqlite.createConnection(NOME_BANCO, false, 'no-encryption', 1, false);
        await conn.open();
        await conn.execute(SCHEMA);
        return conn;
      })();
    }
    return this.db;
  }

  async salvar(r: RegistroPartida) {
    const db = await this.abrir();
    await db.run('DELETE FROM participantes WHERE partida_id = ?', [r.id]);
    await db.run(
      `INSERT OR REPLACE INTO partidas
       (id, inicio, fim, status, motivo, rodadas, maos, vencedor_id, penalizado_id, jogador_local_id)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [r.id, r.inicio, r.fim, r.status, r.motivo, r.rodadas, r.maos, r.vencedorId, r.penalizadoId, r.jogadorLocalId],
    );
    for (const p of r.participantes) {
      await db.run(
        'INSERT INTO participantes (partida_id, jogador_id, nome, posicao, letras, vitorias) VALUES (?,?,?,?,?,?)',
        [r.id, p.id, p.nome, p.posicao, p.letras, p.vitorias],
      );
    }
  }

  private async montar(linha: any): Promise<RegistroPartida> {
    const db = await this.abrir();
    const ps = (await db.query('SELECT * FROM participantes WHERE partida_id = ? ORDER BY posicao', [linha.id])).values ?? [];
    return {
      id: linha.id,
      inicio: linha.inicio,
      fim: linha.fim,
      status: linha.status,
      motivo: linha.motivo,
      rodadas: linha.rodadas,
      maos: linha.maos,
      vencedorId: linha.vencedor_id,
      penalizadoId: linha.penalizado_id,
      jogadorLocalId: linha.jogador_local_id,
      participantes: ps.map((p: any) => ({ id: p.jogador_id, nome: p.nome, posicao: p.posicao, letras: p.letras, vitorias: p.vitorias })),
    };
  }

  async listar() {
    const db = await this.abrir();
    const linhas = (await db.query('SELECT * FROM partidas ORDER BY inicio DESC')).values ?? [];
    return Promise.all(linhas.map((l) => this.montar(l)));
  }

  async obter(id: string) {
    const db = await this.abrir();
    const linha = (await db.query('SELECT * FROM partidas WHERE id = ?', [id])).values?.[0];
    return linha ? this.montar(linha) : null;
  }

  async excluir(id: string) {
    const db = await this.abrir();
    await db.run('DELETE FROM participantes WHERE partida_id = ?', [id]);
    await db.run('DELETE FROM partidas WHERE id = ?', [id]);
  }

  async limpar() {
    const db = await this.abrir();
    await db.run('DELETE FROM participantes');
    await db.run('DELETE FROM partidas');
  }
}

// ---------------- localStorage (apenas para desenvolver no navegador) ----------------
class RepositorioLocalStorage implements RepositorioHistorico {
  private chave = 'burro.historico.dev';
  private ler(): RegistroPartida[] {
    try {
      return JSON.parse(localStorage.getItem(this.chave) ?? '[]');
    } catch {
      return [];
    }
  }
  private gravar(l: RegistroPartida[]) {
    localStorage.setItem(this.chave, JSON.stringify(l));
  }
  async salvar(r: RegistroPartida) {
    this.gravar([r, ...this.ler().filter((x) => x.id !== r.id)]);
  }
  async listar() {
    return this.ler().sort((a, b) => b.inicio.localeCompare(a.inicio));
  }
  async obter(id: string) {
    return this.ler().find((x) => x.id === id) ?? null;
  }
  async excluir(id: string) {
    this.gravar(this.ler().filter((x) => x.id !== id));
  }
  async limpar() {
    this.gravar([]);
  }
}

export const repositorio: RepositorioHistorico = Capacitor.isNativePlatform() ? new RepositorioSqlite() : new RepositorioLocalStorage();
