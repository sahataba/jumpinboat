import { eq } from "drizzle-orm";

import type { User, UserRolePrimary } from "@jumpinboat/shared";

import { db } from "../client.js";
import { users } from "../schema.js";

export type UserRecord = typeof users.$inferSelect;

export type CreateUserRecord = {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly rolePrimary: UserRolePrimary;
};

const toUser = (row: Pick<UserRecord, "id" | "email" | "rolePrimary">): User => ({
  id: row.id as User["id"],
  email: row.email,
  rolePrimary: row.rolePrimary,
});

export const UserRepository = {
  async create(input: CreateUserRecord): Promise<User> {
    const [row] = await db
      .insert(users)
      .values({
        id: input.id,
        email: input.email,
        passwordHash: input.passwordHash,
        rolePrimary: input.rolePrimary,
      })
      .returning({
        id: users.id,
        email: users.email,
        rolePrimary: users.rolePrimary,
      });

    return toUser(row);
  },

  async findRecordByEmail(email: string): Promise<UserRecord | null> {
    const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return row ?? null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.findRecordByEmail(email);
    return row ? toUser(row) : null;
  },

  async findById(id: string): Promise<User | null> {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? toUser(row) : null;
  },
};
