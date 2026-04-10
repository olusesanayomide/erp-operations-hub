import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { createPublicKey } from 'crypto';
import { PrismaService } from 'prisma/prisma.service';

interface JwtHeader {
  alg?: string;
  kid?: string;
}

interface JwtPayLoad {
  sub: string;
  email?: string;
  aud?: string | string[];
  iss?: string;
}

type CachedSigningKey = {
  pem: string;
  expiresAt: number;
};

type Jwk = {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
  crv?: string;
  x?: string;
  y?: string;
};

type JwksResponse = {
  keys: Jwk[];
};

function decodeJwtSection<T>(token: string, index: number): T | null {
  const value = token.split('.')[index];

  if (!value) return null;

  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );

    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as T;
  } catch {
    return null;
  }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly signingKeyCache = new Map<string, CachedSigningKey>();
  private readonly expectedIssuer: string;
  private readonly expectedAudience: string;
  private readonly supabaseJwtSecret?: string;

  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    const supabaseUrl = config
      .get<string>('SUPABASE_URL')
      ?.trim()
      .replace(/\/$/, '');

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is required for Supabase token verification');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: (_request, rawJwtToken, done) => {
        void this.resolveVerificationKey(rawJwtToken)
          .then((key) => done(null, key))
          .catch((error: unknown) => {
            done(
              error instanceof Error
                ? error
                : new UnauthorizedException('Unable to verify access token'),
              undefined,
            );
          });
      },
    });

    this.expectedIssuer = `${supabaseUrl}/auth/v1`;
    this.expectedAudience =
      config.get<string>('SUPABASE_JWT_AUDIENCE') || 'authenticated';
    this.supabaseJwtSecret =
      config.get<string>('SUPABASE_JWT_SECRET') || undefined;
  }

  private decodeHeader(token: string) {
    return decodeJwtSection<JwtHeader>(token, 0);
  }

  private decodePayload(token: string) {
    return decodeJwtSection<JwtPayLoad>(token, 1);
  }

  private assertExpectedIssuer(payload: JwtPayLoad | null) {
    if (!payload?.iss || payload.iss !== this.expectedIssuer) {
      throw new UnauthorizedException(
        'Token issuer is not the configured Supabase project',
      );
    }
  }

  private assertExpectedAudience(payload: JwtPayLoad) {
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];

    if (!audiences.includes(this.expectedAudience)) {
      throw new UnauthorizedException('Token audience is not allowed');
    }
  }

  private async getJwksSigningKey(token: string) {
    const header = this.decodeHeader(token);

    if (!header?.kid) {
      throw new UnauthorizedException('Supabase token is missing a key id');
    }

    const cacheKey = `${this.expectedIssuer}:${header.kid}`;
    const cached = this.signingKeyCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.pem;
    }

    const response = await fetch(`${this.expectedIssuer}/.well-known/jwks.json`);

    if (!response.ok) {
      throw new UnauthorizedException('Unable to load Supabase signing keys');
    }

    const { keys } = (await response.json()) as JwksResponse;
    const jwk = keys.find((item) => item.kid === header.kid);

    if (!jwk) {
      throw new UnauthorizedException('No matching Supabase signing key found');
    }

    const pem = createPublicKey({
      key: jwk,
      format: 'jwk',
    })
      .export({ format: 'pem', type: 'spki' })
      .toString();

    this.signingKeyCache.set(cacheKey, {
      pem,
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    return pem;
  }

  private async resolveVerificationKey(token: string) {
    const payload = this.decodePayload(token);
    this.assertExpectedIssuer(payload);

    const header = this.decodeHeader(token);
    const algorithm = header?.alg;

    if (algorithm?.startsWith('HS')) {
      if (!this.supabaseJwtSecret) {
        throw new UnauthorizedException(
          'SUPABASE_JWT_SECRET is required for HS-signed Supabase tokens',
        );
      }

      return this.supabaseJwtSecret;
    }

    return this.getJwksSigningKey(token);
  }

  private async resolveAppUser(payload: JwtPayLoad) {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException(
        'Token payload is missing subject or email',
      );
    }

    let user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: true, tenant: true },
    });

    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email: payload.email },
        include: { roles: true, tenant: true },
      });
    }

    if (!user || !user.tenantId) {
      throw new UnauthorizedException(
        'Authenticated user does not belong to a tenant. Complete tenant onboarding first.',
      );
    }

    if (user.tenant.status === 'SUSPENDED') {
      throw new UnauthorizedException(
        'This tenant has been suspended. Contact the platform administrator.',
      );
    }

    if (user.tenant.status === 'ARCHIVED') {
      throw new UnauthorizedException(
        'This tenant has been archived and can no longer sign in.',
      );
    }

    return user;
  }

  async validate(payload: JwtPayLoad) {
    this.assertExpectedIssuer(payload);
    this.assertExpectedAudience(payload);

    const user = await this.resolveAppUser(payload);

    return {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles: user.roles.map((role) => role.name),
      isPlatformAdmin: user.isPlatformAdmin,
    };
  }
}
