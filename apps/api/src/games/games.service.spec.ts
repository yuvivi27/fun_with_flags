jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { NotFoundException } from '@nestjs/common';
import { GamesService } from './games.service';

type PrismaMock = {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  score: {
    create: jest.Mock;
  };
  $transaction: jest.Mock;
};

function buildPrisma(): PrismaMock {
  const prisma: PrismaMock = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    score: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (operations: unknown[]) =>
    Promise.all(operations),
  );
  return prisma;
}

describe('GamesService.completeRound', () => {
  it('persists the round, updates xp/level, and returns the new progress', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      totalXp: 200,
    });
    prisma.user.update.mockResolvedValueOnce({
      id: 'user-1',
      email: 'a@b.com',
      username: 'a',
      totalXp: 250,
      currentLevel: 1,
    });
    prisma.score.create.mockResolvedValueOnce({ id: 'score-1' });

    const service = new GamesService(prisma as never);

    const result = await service.completeRound('user-1', {
      score: 50,
      correct: 4,
      total: 10,
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { id: true, totalXp: true },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { totalXp: 250, currentLevel: 1 },
      select: {
        id: true,
        email: true,
        username: true,
        totalXp: true,
        currentLevel: true,
      },
    });
    expect(prisma.score.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        points: 50,
        correct: 4,
        total: 10,
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      user: {
        id: 'user-1',
        email: 'a@b.com',
        username: 'a',
        totalXp: 250,
        currentLevel: 1,
        xpToNextLevel: 150,
        xpRequiredForNextLevel: 400,
      },
      gainedXp: 50,
    });
  });

  it('writes the new level when a level-up boundary is crossed', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-2',
      totalXp: 350,
    });
    prisma.user.update.mockResolvedValueOnce({
      id: 'user-2',
      email: 'b@b.com',
      username: null,
      totalXp: 500,
      currentLevel: 2,
    });
    prisma.score.create.mockResolvedValueOnce({ id: 'score-2' });

    const service = new GamesService(prisma as never);

    const result = await service.completeRound('user-2', {
      score: 150,
      correct: 9,
      total: 10,
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { totalXp: 500, currentLevel: 2 },
      }),
    );
    expect(result.user.currentLevel).toBe(2);
    expect(result.user.xpRequiredForNextLevel).toBe(600);
    expect(result.user.xpToNextLevel).toBe(500);
  });

  it('throws NotFound when the user does not exist', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const service = new GamesService(prisma as never);

    await expect(
      service.completeRound('missing', { score: 10, correct: 1, total: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
