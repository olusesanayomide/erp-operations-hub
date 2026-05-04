import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorator/public.decorator';
import { HealthService } from './health.service';

@Public()
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Get API and database health',
    description:
      'Returns API availability and whether the backend can reach the database.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully.',
  })
  @ApiResponse({
    status: 503,
    description: 'API is up but one or more dependencies are unavailable.',
  })
  async getHealth() {
    const health = await this.healthService.getHealth();

    if (health.status !== 'ok') {
      throw new ServiceUnavailableException(health);
    }

    return health;
  }
}
