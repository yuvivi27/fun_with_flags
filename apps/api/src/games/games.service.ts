import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteRoundDto } from './dto/complete-round.dto';
import { progressFromTotalXp } from '@repo/player-leveling';

/** Persists round scores and XP; leaderboard UI reads from Firestore, not this service. */
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
}
