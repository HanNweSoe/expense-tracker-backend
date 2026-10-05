import { db } from '../config/db';

export interface SessionUser {
  id: number;
  nickname: string;
}

export const sessionModel = {
  create: async (userId: number, tokenHash: string, expiresAt: Date) => {
    await db.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt],
    );
  },

  findUserByTokenHash: async (tokenHash: string): Promise<SessionUser | undefined> => {
    const result = await db.query<SessionUser>(
      `SELECT u.id, u.nickname
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW()
       LIMIT 1`,
      [tokenHash],
    );
    return result.rows[0];
  },

  revoke: async (tokenHash: string) => {
    await db.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
  },
};
