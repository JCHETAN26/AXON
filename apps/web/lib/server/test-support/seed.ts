import { type Database } from "../db/client";
import { users } from "../db/schema";

/** Inserts a user directly and returns its generated id. Test-only. */
export async function seedUser(db: Database, email: string): Promise<string> {
  const rows = await db.insert(users).values({ email, name: email }).returning({ id: users.id });
  const id = rows[0]?.id;
  if (id === undefined) throw new Error("Failed to seed user.");
  return id;
}
