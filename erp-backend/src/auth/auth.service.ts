import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from './enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  //   Register User
  async register(dto: CreateUserDto) {
    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltOrRounds);
    const registrationRole = Role.STAFF;

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        roles: {
          connectOrCreate: {
            where: { name: registrationRole },
            create: { name: registrationRole },
          },
        },
      },
      include: { roles: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  // User Login
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { roles: true },
    });
    if (!user) {
      throw new UnauthorizedException('Credentials Incorrect');
    }

    const pwMatches = await bcrypt.compare(dto.password, user.password);
    if (!pwMatches) {
      throw new UnauthorizedException('Credentials Incorrect ');
    }
    // Generate Jwt Payload
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map((r) => r.name),
    };
    // sign the  token and return it
    const token = await this.jwt.signAsync(payload, {
      expiresIn: '1h',
      secret: this.config.get<string>('JWT_SECRET'),
    });
    return {
      message: 'Logged in Successfully',
      access_token: token,
      user: {
        email: user.email,
        name: user.name,
        roles: user.roles.map((r) => r.name),
      },
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user) {
      throw new UnauthorizedException('Authenticated user was not found');
    }

    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles.map((role) => role.name),
      createdAt: user.createdAt,
    };
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      include: { roles: true },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles.map((role) => role.name),
      createdAt: user.createdAt,
    }));
  }
}
