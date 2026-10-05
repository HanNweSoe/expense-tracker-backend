import { db } from '../config/db';

export interface User {
  id: number;
  nickname: string;
}

const userColumns = 'id, nickname';

export const userModel = {
  findAll: async (): Promise<User[]> => {
    const result = await db.query<User>(`SELECT ${userColumns} FROM users ORDER BY id`);
    return result.rows;
  },

  findById: async (id: number): Promise<User | undefined> => {
    const result = await db.query<User>(
      `SELECT ${userColumns} FROM users WHERE id = $1 LIMIT 1`,
      [id],
    );
    return result.rows[0];
  },

  findByNickname: async (nickname: string): Promise<User | undefined> => {
    const result = await db.query<User>(
      `SELECT ${userColumns} FROM users WHERE LOWER(nickname) = LOWER($1) LIMIT 1`,
      [nickname],
    );
    return result.rows[0];
  },

  create: async (nickname: string): Promise<User> => {
    const result = await db.query<User>(
      `INSERT INTO users (nickname, name)
       VALUES ($1, $1)
       RETURNING ${userColumns}`,
      [nickname],
    );
    return result.rows[0];
  },
};
