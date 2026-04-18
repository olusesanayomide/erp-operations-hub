import { Controller, Get } from '@nestjs/common';
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
  getHealth() {
    return this.healthService.getHealth();
  }
}
