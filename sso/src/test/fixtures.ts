import type { DataSource } from "typeorm";
import bcrypt from "bcryptjs";
import { User } from "@/entities/User";

let userCounter = 0;

export async function seedUser(
  dataSource: DataSource,
  overrides: Partial<User> & { password?: string } = {},
): Promise<User> {
  userCounter += 1;
  const { password, ...rest } = overrides;
  const repo = dataSource.getRepository(User);
  const user = repo.create({
    id: `user-${userCounter}`,
    name: "Test User",
    email: `user${userCounter}@example.com`,
    password: await bcrypt.hash(password ?? "correct-password", 10),
    role: "SUPERADMIN",
    isActive: true,
    teamId: null,
    mfaEnabled: false,
    tokenVersion: 0,
    ...rest,
  });
  return repo.save(user);
}
