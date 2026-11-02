import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

let client: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (!client) {
    client = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
  }
  return client;
}

export async function disconnectPrisma(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = undefined;
  }
}

export type { PrismaClient };
