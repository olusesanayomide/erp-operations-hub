import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  // Query,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StockMovementDto } from './dto/stock-movement.dto';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { Roles } from 'src/auth/decorator/role.decorator';
import { Role } from 'src/auth/enums/role.enum';

@ApiBearerAuth('access-token')
@UseGuards(JwtGuard, RolesGuard)
@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Get total inventory levels',
    description:
      'Calculates the sum of all stock movements across all warehouses to provide a global view of current stock.',
  })
  @ApiResponse({
    status: 200,
    description: 'Return current stock levels for all products.',
  })
  getAllInventory() {
    return this.inventoryService.getInventory();
  }

  @Get(':warehouseId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Get inventory by warehouse',
    description: 'Fetches stock levels filtered by a specific warehouse ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Warehouse stock details retrieved successfully.',
  })
  @ApiResponse({ status: 404, description: 'Warehouse not found or empty.' })
  async getWarehouseInventory(@Param('warehouseId') warehouseId: string) {
    const items =
      await this.inventoryService.getInventoryByWarehouse(warehouseId);

    if (!items || items.length === 0) {
      throw new NotFoundException(
        'Warehouse not found or has no inventory items.',
      );
    }
    return items;
  }

  // @Get('movements')
  // async getStockMovements(
  //   @Query('page') page?: string,
  //   @Query('limit') limit?: string,
  // ) {
  //   const _page = Number(page) || 1;
  //   const _limit = Number(limit) || 10;
  //   return this.inventoryService.getStockMovements(_page, _limit);
  // }

  @Post('stock-in')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({
    summary: 'Manual Stock In',
    description:
      'Creates a positive stock movement event in the ledger. Use this for adjustments or initial loading.',
  })
  @ApiResponse({ status: 201, description: 'Stock increased successfully.' })
  async stockIn(@Body() dto: StockMovementDto) {
    const { productId, warehouseId, quantity } = dto;
    return this.inventoryService.stockIn(productId, warehouseId, quantity);
  }

  @Post('stock-out')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({
    summary: 'Manual Stock Out',
    description:
      'Creates a negative stock movement event in the ledger. Validates if enough stock exists before deducting.',
  })
  @ApiResponse({ status: 201, description: 'Stock decreased successfully.' })
  @ApiResponse({ status: 400, description: 'Insufficient stock levels.' })
  async stockOut(@Body() dto: StockMovementDto) {
    const { productId, warehouseId, quantity } = dto;
    return this.inventoryService.stockOut(productId, warehouseId, quantity);
  }
}
