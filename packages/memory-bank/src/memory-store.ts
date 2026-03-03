/**
 * @voice-hub/memory-bank
 *
 * 记忆存储实现
 */

import { randomUUID } from 'node:crypto';
import type {
  SessionState,
  TurnMetadata,
  ProviderEvent,
  AudioFrame,
} from '@voice-hub/shared-types';
import type {
  MemoryEntry,
  SessionRecord,
  QueryOptions,
  MemoryStats,
} from './types.js';
import { MemoryType, MemoryStatus } from './types.js';
import { DatabaseManager } from './database.js';

/** 记忆存储类 */
export class MemoryStore {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  // ========== 会话操作 ==========

  /** 创建会话 */
  createSession(
    sessionId: string,
    userId?: string,
    channelId?: string
  ): SessionRecord {
    const stmt = this.db.getConnection().prepare(`
      INSERT INTO sessions (session_id, state, started_at, user_id, channel_id)
      VALUES (?, 'idle', ?, ?, ?)
    `);

    const now = Date.now();
    stmt.run(sessionId, now, userId || null, channelId || null);

    return this.getSession(sessionId)!;
  }

  /** 获取会话 */
  getSession(sessionId: string): SessionRecord | null {
    const stmt = this.db.getConnection().prepare(`
      SELECT * FROM sessions WHERE session_id = ?
    `);

    const row = stmt.get(sessionId) as SessionRecordRow | undefined;

    if (!row) return null;

    return this.rowToSessionRecord(row);
  }

  /** 更新会话状态 */
  updateSessionState(sessionId: string, state: SessionState): void {
    const stmt = this.db.getConnection().prepare(`
      UPDATE sessions SET state = ? WHERE session_id = ?
    `);
    stmt.run(state, sessionId);
  }

  /** 结束会话 */
  endSession(sessionId: string): void {
    const stmt = this.db.getConnection().prepare(`
      UPDATE sessions SET state = 'idle', ended_at = ? WHERE session_id = ?
    `);
    stmt.run(Date.now(), sessionId);
  }

  /** 获取所有活跃会话 */
  getActiveSessions(): SessionRecord[] {
    const stmt = this.db.getConnection().prepare(`
      SELECT * FROM sessions WHERE state != 'idle' ORDER BY started_at DESC
    `);

    const rows = stmt.all() as SessionRecordRow[];
    return rows.map((row) => this.rowToSessionRecord(row));
  }

  // ========== 记忆操作 ==========

  /** 添加记忆条目 */
  addMemory(
    sessionId: string,
    type: MemoryType,
    content: string,
    metadata?: TurnMetadata | Record<string, unknown>,
    startTime?: number,
    audioPath?: string
  ): MemoryEntry {
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.getConnection().prepare(`
      INSERT INTO memories (
        id, session_id, type, content, metadata,
        start_time, audio_path
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      sessionId,
      type,
      content,
      metadata ? JSON.stringify(metadata) : null,
      startTime || now,
      audioPath || null
    );

    return this.getMemory(id)!;
  }

  /** 获取记忆条目 */
  getMemory(id: string): MemoryEntry | null {
    const stmt = this.db.getConnection().prepare(`
      SELECT * FROM memories WHERE id = ?
    `);

    const row = stmt.get(id) as MemoryEntryRow | undefined;
    if (!row) return null;

    return this.rowToMemoryEntry(row);
  }

  /** 更新记忆条目 */
  updateMemory(
    id: string,
    updates: Partial<{
      content: string;
      metadata: TurnMetadata | Record<string, unknown>;
      endTime: number;
      audioPath: string;
      status: MemoryStatus;
    }>
  ): void {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }
    if (updates.endTime !== undefined) {
      fields.push('end_time = ?');
      values.push(updates.endTime);
    }
    if (updates.audioPath !== undefined) {
      fields.push('audio_path = ?');
      values.push(updates.audioPath);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    if (fields.length === 0) return;

    values.push(id);
    const stmt = this.db.getConnection().prepare(`
      UPDATE memories SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
  }

  /** 查询记忆条目 */
  queryMemories(sessionId: string, options: QueryOptions = {}): MemoryEntry[] {
    const {
      limit = 100,
      offset = 0,
      orderBy = 'startTime',
      order = 'ASC',
      types,
      status,
      since,
      until,
    } = options;

    const conditions: string[] = ['session_id = ?'];
    const values: unknown[] = [sessionId];

    if (types && types.length > 0) {
      conditions.push(`type IN (${types.map(() => '?').join(', ')})`);
      values.push(...types);
    }

    if (status) {
      conditions.push('status = ?');
      values.push(status);
    }

    if (since) {
      conditions.push('start_time >= ?');
      values.push(since);
    }

    if (until) {
      conditions.push('start_time <= ?');
      values.push(until);
    }

    const orderByCol = orderBy === 'createdAt' ? 'created_at' : 'start_time';

    const stmt = this.db.getConnection().prepare(`
      SELECT * FROM memories
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderByCol} ${order}
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(...values, limit, offset) as MemoryEntryRow[];
    return rows.map((row) => this.rowToMemoryEntry(row));
  }

  /** 获取会话的最近记忆 */
  getRecentMemories(sessionId: string, count = 10): MemoryEntry[] {
    return this.queryMemories(sessionId, {
      limit: count,
      orderBy: 'startTime',
      order: 'DESC',
    });
  }

  /** 获取会话的对话历史（用户 + 助手） */
  getConversationHistory(
    sessionId: string,
    options: QueryOptions = {}
  ): MemoryEntry[] {
    return this.queryMemories(sessionId, {
      ...options,
      types: [MemoryType.USER, MemoryType.ASSISTANT],
    });
  }

  /** 删除记忆条目（软删除） */
  deleteMemory(id: string): void {
    this.updateMemory(id, { status: MemoryStatus.DELETED });
  }

  /** 归档记忆条目 */
  archiveMemory(id: string): void {
    this.updateMemory(id, { status: MemoryStatus.ARCHIVED });
  }

  // ========== 统计操作 ==========

  /** 获取统计信息 */
  getStats(): MemoryStats {
    const db = this.db.getConnection();

    // 总会话数
    const totalSessions = db
      .prepare('SELECT count(*) as count FROM sessions')
      .get() as { count: number };

    // 活跃会话数
    const activeSessions = db
      .prepare("SELECT count(*) as count FROM sessions WHERE state != 'idle'")
      .get() as { count: number };

    // 总记忆条目数
    const totalEntries = db
      .prepare("SELECT count(*) as count FROM memories WHERE status = 'active'")
      .get() as { count: number };

    // 按类型分组
    const typeStats = db
      .prepare(`
        SELECT type, count(*) as count
        FROM memories
        WHERE status = 'active'
        GROUP BY type
      `)
      .all() as { type: MemoryType; count: number }[];

    const entriesByType: Record<MemoryType, number> = {
      [MemoryType.USER]: 0,
      [MemoryType.ASSISTANT]: 0,
      [MemoryType.SYSTEM]: 0,
      [MemoryType.EVENT]: 0,
      [MemoryType.ERROR]: 0,
    };

    for (const stat of typeStats) {
      entriesByType[stat.type] = stat.count;
    }

    // 数据库大小
    const sizeStmt = db.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()');
    const dbSize = (sizeStmt.get() as { size: number }).size;

    return {
      totalSessions: totalSessions.count,
      activeSessions: activeSessions.count,
      totalEntries: totalEntries.count,
      entriesByType,
      dbSize,
    };
  }

  // ========== 清理操作 ==========

  /** 清理旧记忆 */
  cleanupOldMemories(beforeDate: number): number {
    const stmt = this.db.getConnection().prepare(`
      UPDATE memories
      SET status = 'archived'
      WHERE start_time < ? AND status = 'active'
    `);

    const result = stmt.run(beforeDate);
    return result.changes;
  }

  /** 清空会话记忆 */
  clearSessionMemories(sessionId: string): number {
    const stmt = this.db.getConnection().prepare(`
      DELETE FROM memories WHERE session_id = ?
    `);

    const result = stmt.run(sessionId);
    return result.changes;
  }

  // ========== 私有方法 ==========

  private rowToSessionRecord(row: SessionRecordRow): SessionRecord {
    return {
      sessionId: row.session_id,
      state: row.state as SessionState,
      startedAt: row.started_at,
      endedAt: row.ended_at || undefined,
      userId: row.user_id || undefined,
      channelId: row.channel_id || undefined,
      metadata: row.metadata || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private rowToMemoryEntry(row: MemoryEntryRow): MemoryEntry {
    return {
      id: row.id,
      sessionId: row.session_id,
      type: row.type as MemoryType,
      status: row.status as MemoryStatus,
      content: row.content,
      metadata: row.metadata || undefined,
      startTime: row.start_time,
      endTime: row.end_time || undefined,
      audioPath: row.audio_path || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// ========== 数据库行类型 ==========

interface SessionRecordRow {
  session_id: string;
  state: string;
  started_at: number;
  ended_at: number | null;
  user_id: string | null;
  channel_id: string | null;
  metadata: string | null;
  created_at: number;
  updated_at: number;
}

interface MemoryEntryRow {
  id: string;
  session_id: string;
  type: string;
  status: string;
  content: string;
  metadata: string | null;
  start_time: number;
  end_time: number | null;
  audio_path: string | null;
  created_at: number;
  updated_at: number;
}
