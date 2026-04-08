import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { progressFromTotalXp } from '../games/leveling';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

type AuthPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existingUser) {
      throw new BadRequestException('Email is already in use');
    }

    if (dto.username) {
      const existingUsername = await this.prisma.user.findUnique({
        where: { username: dto.username },
        select: { id: true },
      });
      if (existingUsername) {
        throw new BadRequestException('Username is already in use');
      }
    }

    const passwordHash = await hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        username: dto.username,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        username: true,
        totalXp: true,
        currentLevel: true,
      },
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        username: true,
        passwordHash: true,
        totalXp: true,
        currentLevel: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        totalXp: true,
        currentLevel: true,
      },
    });
    if (!user) return null;
    return this.withProgress(user);
  }

  private async buildAuthResponse(user: {
    id: string;
    email: string;
    username: string | null;
    totalXp: number;
    currentLevel: number;
  }) {
    const payload: AuthPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: this.withProgress(user),
    };
  }

  private withProgress(user: {
    id: string;
    email: string;
    username: string | null;
    totalXp: number;
    currentLevel: number;
  }) {
    const progress = progressFromTotalXp(user.totalXp);
    return {
      ...user,
      currentLevel: progress.currentLevel,
      xpToNextLevel: progress.xpToNextLevel,
      xpRequiredForNextLevel: progress.xpRequiredForNextLevel,
    };
  }
}
