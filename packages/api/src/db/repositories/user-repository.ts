import { eq } from "drizzle-orm";

import type { User, UserRolePrimary } from "@jumpinboat/shared";

import { getDb } from "../client.js";
import { users } from "../schema.js";

export type UserRecord = typeof users.$inferSelect;

export type CreateUserRecord = {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly rolePrimary: UserRolePrimary;
  readonly canBook: boolean;
  readonly canListBoats: boolean;
};

const toUser = (
  row: Pick<UserRecord, "id" | "email" | "rolePrimary" | "canBook" | "canListBoats">,
): User => ({
  id: row.id as User["id"],
  email: row.email,
  rolePrimary: row.rolePrimary,
  canBook: row.canBook,
  canListBoats: row.canListBoats,
});

export const UserRepository = {
  async create(input: CreateUserRecord): Promise<User> {
    const [row] = await getDb()
      .insert(users)
      .values({
        id: input.id,
        email: input.email,
        passwordHash: input.passwordHash,
        rolePrimary: input.rolePrimary,
        canBook: input.canBook,
        canListBoats: input.canListBoats,
      })
      .returning();

    return toUser(row);
  },

  async findRecordByEmail(email: string): Promise<UserRecord | null> {
    const [row] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
    return row ?? null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.findRecordByEmail(email);
    return row ? toUser(row) : null;
  },

  async findById(id: string): Promise<User | null> {
    const [row] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
    return row ? toUser(row) : null;
  },

  async updateCapabilities(
    id: string,
    caps: { canBook?: boolean; canListBoats?: boolean },
  ): Promise<User | null> {
    const [row] = await getDb()
      .update(users)
      .set({
        ...(caps.canBook !== undefined ? { canBook: caps.canBook } : {}),
        ...(caps.canListBoats !== undefined ? { canListBoats: caps.canListBoats } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return row ? toUser(row) : null;
  },
};
