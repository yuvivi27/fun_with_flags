jest.mock('bcryptjs', () => ({
  hash: jest.fn(async (pw: string) => `hashed:${pw}`),
  compare: jest.fn(async (pw: string, hashed: string) => hashed === `hashed:${pw}`),
}));

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'e2e-test-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://e2e';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

type StoredUser = {
  id: string;
  email: string;
  username: string | null;
  passwordHash: string;
  totalXp: number;
  currentLevel: number;
};

class InMemoryPrisma {
  private readonly users = new Map<string, StoredUser>();
  private readonly scores: Array<{
    id: string;
    userId: string;
    points: number;
    correct: number;
    total: number;
  }> = [];
  private nextUserId = 1;

  user = {
    findUnique: async ({
      where,
      // select is intentionally ignored: returning the full record is harmless for tests.
      select: _select,
    }: {
      where: { id?: string; email?: string; username?: string };
      select?: unknown;
    }): Promise<StoredUser | null> => {
      const list = Array.from(this.users.values());
      const found = list.find((u) => {
        if (where.id !== undefined) return u.id === where.id;
        if (where.email !== undefined) return u.email === where.email;
        if (where.username !== undefined) return u.username === where.username;
        return false;
      });
      return found ?? null;
    },
    create: async ({
      data,
    }: {
      data: { email: string; username?: string; passwordHash: string };
    }): Promise<StoredUser> => {
      const user: StoredUser = {
        id: `user-${this.nextUserId++}`,
        email: data.email,
        username: data.username ?? null,
        passwordHash: data.passwordHash,
        totalXp: 0,
        currentLevel: 1,
      };
      this.users.set(user.id, user);
      return user;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<StoredUser>;
    }): Promise<StoredUser> => {
      const existing = this.users.get(where.id);
      if (!existing) throw new Error('User missing');
      const next = { ...existing, ...data };
      this.users.set(where.id, next);
      return next;
    },
  };

  score = {
    create: async ({
      data,
    }: {
      data: { userId: string; points: number; correct: number; total: number };
    }) => {
      const stored = { id: `score-${this.scores.length + 1}`, ...data };
      this.scores.push(stored);
      return stored;
    },
  };

  async $transaction<T>(operations: Promise<T>[]): Promise<T[]> {
    return Promise.all(operations);
  }

  async onModuleInit(): Promise<void> {}
  async onModuleDestroy(): Promise<void> {}
}

describe('App E2E', () => {
  let app: INestApplication;
  let prisma: InMemoryPrisma;

  beforeAll(async () => {
    prisma = new InMemoryPrisma();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /', () => {
    it('returns the hello world greeting', async () => {
      await request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });
  });

  describe('Auth', () => {
    it('rejects signup payloads that fail validation', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'not-an-email', password: 'short' })
        .expect(400);
    });

    it('signs up a new user and returns an access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'alice@example.com',
          password: 'pw-12345',
          username: 'alice',
        })
        .expect(201);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.user).toEqual(
        expect.objectContaining({
          email: 'alice@example.com',
          username: 'alice',
          currentLevel: 1,
          totalXp: 0,
          xpToNextLevel: 400,
          xpRequiredForNextLevel: 400,
        }),
      );
    });

    it('refuses duplicate emails', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'alice@example.com',
          password: 'pw-12345',
          username: 'someone-else',
        })
        .expect(400);
    });

    it('rejects login with an unknown email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'pw-12345' })
        .expect(401);
    });

    it('rejects login with a wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'wrong-pw' })
        .expect(401);
    });

    it('logs in a registered user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'pw-12345' })
        .expect(201);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.user.email).toBe('alice@example.com');
    });

    it('rejects /auth/me without a bearer token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('returns the current user with derived progress for /auth/me', async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'pw-12345' })
        .expect(201);
      const token: string = login.body.accessToken;

      const me = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(me.body).toEqual(
        expect.objectContaining({
          email: 'alice@example.com',
          totalXp: 0,
          xpToNextLevel: 400,
        }),
      );
    });
  });

  describe('Games', () => {
    let token: string;

    beforeAll(async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'pw-12345' });
      token = login.body.accessToken;
    });

    it('rejects unauthenticated complete-round', async () => {
      await request(app.getHttpServer())
        .post('/games/complete-round')
        .send({ score: 50, correct: 5, total: 10 })
        .expect(401);
    });

    it('records a round and reflects new XP/progress', async () => {
      const response = await request(app.getHttpServer())
        .post('/games/complete-round')
        .set('Authorization', `Bearer ${token}`)
        .send({ score: 50, correct: 5, total: 10 })
        .expect(201);

      expect(response.body).toEqual({
        gainedXp: 50,
        user: expect.objectContaining({
          email: 'alice@example.com',
          totalXp: 50,
          xpToNextLevel: 350,
          xpRequiredForNextLevel: 400,
        }),
      });
    });

    it('rejects invalid complete-round payloads', async () => {
      await request(app.getHttpServer())
        .post('/games/complete-round')
        .set('Authorization', `Bearer ${token}`)
        .send({ score: -1, correct: 0, total: 0 })
        .expect(400);
    });
  });
});
