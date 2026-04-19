import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { UpdateCurrencySettingsDto } from './dto/update-currency-settings.dto';
import { assertUnchangedSinceLoaded } from '../common/concurrency';

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
	        updatedAt: true,
	      },
	    });

    return {
	      currencyCode: tenant.currencyCode,
	      locale: tenant.currencyLocale,
	      exchangeRate: Number(tenant.currencyExchangeRate),
	      updatedAt: tenant.updatedAt,
	    };
	  }

  async updateCurrencySettings(
    tenantId: string,
    dto: UpdateCurrencySettingsDto,
  ) {
	    const tenant = await this.prisma.$transaction(async (tx) => {
	      const existingTenant = await tx.tenant.findUniqueOrThrow({
	        where: { id: tenantId },
	        select: { updatedAt: true },
	      });

	      assertUnchangedSinceLoaded(existingTenant.updatedAt, dto.expectedUpdatedAt);

	      return tx.tenant.update({
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
	          updatedAt: true,
	        },
	      });
	    });

    return {
	      currencyCode: tenant.currencyCode,
	      locale: tenant.currencyLocale,
	      exchangeRate: Number(tenant.currencyExchangeRate),
	      updatedAt: tenant.updatedAt,
	    };
	  }
}
