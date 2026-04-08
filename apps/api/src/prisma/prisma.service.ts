import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    const adapter = new PrismaPg({ connectionString });
    super({
      adapter,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.connectWithRetry();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  private async connectWithRetry(
    maxAttempts = 8,
    initialDelayMs = 1000,
  ): Promise<void> {
    let attempt = 1;
    let delayMs = initialDelayMs;

    while (attempt <= maxAttempts) {
      try {
        await this.$connect();
        this.logger.log('Connected to PostgreSQL via Prisma');
        return;
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts;
        this.logger.warn(
          `Prisma connection attempt ${attempt}/${maxAttempts} failed. ${isLastAttempt ? 'No retries left.' : `Retrying in ${delayMs}ms...`}`,
        );

        if (isLastAttempt) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs = Math.min(delayMs * 2, 8000);
        attempt += 1;
      }
    }
  }
}
