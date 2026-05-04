jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { AuthService } from './auth.service';

const mockedHash = hash as jest.MockedFunction<typeof hash>;
const mockedCompare = compare as jest.MockedFunction<typeof compare>;

type PrismaMock = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
};

type JwtMock = {
  signAsync: jest.Mock;
};

function buildPrisma(): PrismaMock {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
}

function buildJwt(): JwtMock {
  return {
    signAsync: jest.fn().mockResolvedValue('mock-token'),
  };
}

function buildService(prisma: PrismaMock, jwt: JwtMock): AuthService {
  return new AuthService(prisma as never, jwt as never);
}

describe('AuthService', () => {
  beforeEach(() => {
    mockedHash.mockReset();
    mockedCompare.mockReset();
    mockedHash.mockResolvedValue('hashed-pw' as never);
  });

  describe('signup', () => {
    it('creates a new user, hashes password, and returns a signed token + progress', async () => {
      const prisma = buildPrisma();
      const jwt = buildJwt();
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({
        id: 'user-1',
        email: 'alice@example.com',
        username: 'alice',
        totalXp: 0,
        currentLevel: 1,
      });

      const service = buildService(prisma, jwt);

      const result = await service.signup({
        email: '  Alice@Example.com  ',
        password: 'pw-12345',
        username: 'alice',
      });

      expect(prisma.user.findUnique).toHaveBeenNthCalledWith(1, {
        where: { email: 'alice@example.com' },
        select: { id: true },
      });
      expect(prisma.user.findUnique).toHaveBeenNthCalledWith(2, {
        where: { username: 'alice' },
        select: { id: true },
      });
      expect(mockedHash).toHaveBeenCalledWith('pw-12345', 12);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'alice@example.com',
          username: 'alice',
          passwordHash: 'hashed-pw',
        },
        select: {
          id: true,
          email: true,
          username: true,
          totalXp: true,
          currentLevel: true,
        },
      });

      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'alice@example.com',
      });

      expect(result).toEqual({
        accessToken: 'mock-token',
        user: expect.objectContaining({
          id: 'user-1',
          email: 'alice@example.com',
          username: 'alice',
          totalXp: 0,
          currentLevel: 1,
          xpToNextLevel: 400,
          xpRequiredForNextLevel: 400,
        }),
      });
    });

    it('does not check username uniqueness when no username provided', async () => {
      const prisma = buildPrisma();
      const jwt = buildJwt();
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({
        id: 'user-2',
        email: 'bob@example.com',
        username: null,
        totalXp: 0,
        currentLevel: 1,
      });

      const service = buildService(prisma, jwt);

      await service.signup({
        email: 'bob@example.com',
        password: 'pw-12345',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            username: undefined,
          }),
        }),
      );
    });

    it('rejects when the email is already in use', async () => {
      const prisma = buildPrisma();
      const jwt = buildJwt();
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'taken' });
      const service = buildService(prisma, jwt);

      await expect(
        service.signup({
          email: 'dup@example.com',
          password: 'pw-12345',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects when the username is already in use', async () => {
      const prisma = buildPrisma();
      const jwt = buildJwt();
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'someone-else' });

      const service = buildService(prisma, jwt);

      await expect(
        service.signup({
          email: 'fresh@example.com',
          password: 'pw-12345',
          username: 'taken-name',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns a token and user progress on valid credentials', async () => {
      const prisma = buildPrisma();
      const jwt = buildJwt();
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-9',
        email: 'carol@example.com',
        username: 'carol',
        passwordHash: 'stored-hash',
        totalXp: 1000,
        currentLevel: 3,
      });
      mockedCompare.mockResolvedValueOnce(true as never);

      const service = buildService(prisma, jwt);

      const result = await service.login({
        email: 'CAROL@example.com',
        password: 'pw-12345',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'carol@example.com' },
        select: {
          id: true,
          email: true,
          username: true,
          passwordHash: true,
          totalXp: true,
          currentLevel: true,
        },
      });
      expect(mockedCompare).toHaveBeenCalledWith('pw-12345', 'stored-hash');
      expect(result.accessToken).toBe('mock-token');
      expect(result.user).toEqual(
        expect.objectContaining({
          id: 'user-9',
          email: 'carol@example.com',
          currentLevel: 3,
          xpToNextLevel: 800,
          xpRequiredForNextLevel: 800,
        }),
      );
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('throws Unauthorized when no user matches the email', async () => {
      const prisma = buildPrisma();
      const jwt = buildJwt();
      prisma.user.findUnique.mockResolvedValueOnce(null);

      const service = buildService(prisma, jwt);

      await expect(
        service.login({ email: 'nope@example.com', password: 'pw-12345' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws Unauthorized when the password does not match', async () => {
      const prisma = buildPrisma();
      const jwt = buildJwt();
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u',
        email: 'u@example.com',
        username: null,
        passwordHash: 'stored-hash',
        totalXp: 0,
        currentLevel: 1,
      });
      mockedCompare.mockResolvedValueOnce(false as never);

      const service = buildService(prisma, jwt);

      await expect(
        service.login({ email: 'u@example.com', password: 'wrong-pw' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('me', () => {
    it('returns null when the user is missing', async () => {
      const prisma = buildPrisma();
      const jwt = buildJwt();
      prisma.user.findUnique.mockResolvedValueOnce(null);
      const service = buildService(prisma, jwt);

      await expect(service.me('missing')).resolves.toBeNull();
    });

    it('returns the user with derived progress', async () => {
      const prisma = buildPrisma();
      const jwt = buildJwt();
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-7',
        email: 'd@example.com',
        username: 'd',
        totalXp: 400,
        currentLevel: 2,
      });
      const service = buildService(prisma, jwt);

      await expect(service.me('user-7')).resolves.toEqual({
        id: 'user-7',
        email: 'd@example.com',
        username: 'd',
        totalXp: 400,
        currentLevel: 2,
        xpToNextLevel: 600,
        xpRequiredForNextLevel: 600,
      });
    });
  });
});
