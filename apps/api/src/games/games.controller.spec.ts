jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

describe('GamesController', () => {
  const gamesServiceMock = {
    completeRound: jest.fn(),
  };

  let controller: GamesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [GamesController],
      providers: [{ provide: GamesService, useValue: gamesServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(GamesController);
  });

  it('delegates completeRound to the service with the current user id', async () => {
    gamesServiceMock.completeRound.mockResolvedValue({ gainedXp: 12 });

    await expect(
      controller.completeRound(
        { sub: 'user-1' },
        { score: 12, correct: 3, total: 5 },
      ),
    ).resolves.toEqual({ gainedXp: 12 });

    expect(gamesServiceMock.completeRound).toHaveBeenCalledWith('user-1', {
      score: 12,
      correct: 3,
      total: 5,
    });
  });
});
