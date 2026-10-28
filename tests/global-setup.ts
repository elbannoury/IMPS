import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export default function setup() {
  const dbPath = path.join(process.cwd(), "prisma", "test.db");
  if (fs.existsSync(dbPath)) fs.rmSync(dbPath);
  execSync("npx prisma migrate deploy", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "pipe",
  });
}
