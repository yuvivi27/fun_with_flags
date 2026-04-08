import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteRoundDto } from './dto/complete-round.dto';
import { progressFromTotalXp } from './leveling';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async completeRound(userId: string, dto: CompleteRoundDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, totalXp: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const nextTotalXp = user.totalXp + dto.score;
    const nextProgress = progressFromTotalXp(nextTotalXp);

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          totalXp: nextTotalXp,
          currentLevel: nextProgress.currentLevel,
        },
        select: {
          id: true,
          email: true,
          username: true,
          totalXp: true,
          currentLevel: true,
        },
      }),
      this.prisma.score.create({
        data: {
          userId,
          points: dto.score,
          correct: dto.correct,
          total: dto.total,
        },
      }),
    ]);

    return {
      user: {
        ...updatedUser,
        xpToNextLevel: nextProgress.xpToNextLevel,
        xpRequiredForNextLevel: nextProgress.xpRequiredForNextLevel,
      },
      gainedXp: dto.score,
    };
  }

  async getLeaderboard(userId: string) {
    const [topUsers, currentUser] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        orderBy: [{ totalXp: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
        take: 10,
        select: {
          id: true,
          username: true,
          email: true,
          totalXp: true,
          currentLevel: true,
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          totalXp: true,
          currentLevel: true,
          createdAt: true,
        },
      }),
    ]);

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    const usersAhead = await this.prisma.user.count({
      where: {
        OR: [
          { totalXp: { gt: currentUser.totalXp } },
          {
            totalXp: currentUser.totalXp,
            OR: [
              { createdAt: { lt: currentUser.createdAt } },
              {
                createdAt: currentUser.createdAt,
                id: { lt: currentUser.id },
              },
            ],
          },
        ],
      },
    });

    const topTen = topUsers.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      username: user.username ?? user.email.split('@')[0] ?? 'Player',
      totalXp: user.totalXp,
      currentLevel: user.currentLevel,
    }));

    return {
      topTen,
      currentUser: {
        rank: usersAhead + 1,
        id: currentUser.id,
        username: currentUser.username ?? currentUser.email.split('@')[0] ?? 'Player',
        totalXp: currentUser.totalXp,
        currentLevel: currentUser.currentLevel,
      },
    };
  }
}
