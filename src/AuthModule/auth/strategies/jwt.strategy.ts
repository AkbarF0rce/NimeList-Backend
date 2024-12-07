import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Mengambil token dari header Authorization
      ignoreExpiration: false, // Jangan abaikan kedaluwarsa token
      secretOrKey: configService.get<string>('JWT_SECRET'), // Menggunakan JWT_SECRET dari .env
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.userId,
      email: payload.email,
      username: payload.username,
      role: payload.role,
      name: payload.name,
    };
  }
}
