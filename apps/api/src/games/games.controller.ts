import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompleteRoundDto } from './dto/complete-round.dto';
import { GamesService } from './games.service';

@Controller('games')
@UseGuards(JwtAuthGuard)
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get('leaderboard')
  leaderboard(@CurrentUser() user: { sub: string }) {
    return this.gamesService.getLeaderboard(user.sub);
  }

  @Post('complete-round')
  completeRound(
    @CurrentUser() user: { sub: string },
    @Body() dto: CompleteRoundDto,
  ) {
    return this.gamesService.completeRound(user.sub, dto);
  }
}
