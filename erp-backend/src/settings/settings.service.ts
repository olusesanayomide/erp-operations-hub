import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { UpdateCurrencySettingsDto } from './dto/update-currency-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrencySettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        currencyCode: true,
        currencyLocale: true,
        currencyExchangeRate: true,
      },
    });

    return {
      currencyCode: tenant.currencyCode,
      locale: tenant.currencyLocale,
      exchangeRate: Number(tenant.currencyExchangeRate),
    };
  }

  async updateCurrencySettings(
    tenantId: string,
    dto: UpdateCurrencySettingsDto,
  ) {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        currencyCode: dto.currencyCode.trim().toUpperCase(),
        currencyLocale: dto.locale.trim(),
        currencyExchangeRate: new Prisma.Decimal(dto.exchangeRate),
      },
      select: {
        currencyCode: true,
        currencyLocale: true,
        currencyExchangeRate: true,
      },
    });

    return {
      currencyCode: tenant.currencyCode,
      locale: tenant.currencyLocale,
      exchangeRate: Number(tenant.currencyExchangeRate),
    };
  }
}
