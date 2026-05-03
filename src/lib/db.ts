import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

let _instance: PrismaClient | undefined;

function getInstance(): PrismaClient {
  if (_instance) return _instance;
  if (globalForPrisma.prisma) {
    _instance = globalForPrisma.prisma;
    return _instance;
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Throw only when actually used. This lets Next.js import this module
    // during static analysis without a database being configured (e.g. for /_not-found).
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({ connectionString: url });
  _instance = new PrismaClient({ adapter });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = _instance;
  }
  return _instance;
}

// Lazy proxy: importing `prisma` doesn't construct the client. Each property access
// (e.g. `prisma.user.findMany`) triggers initialization on demand.
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    const inst = getInstance() as unknown as Record<string | symbol, unknown>;
    return inst[prop];
  },
});
