import {
  Body,
  Controller,
  Patch,
  Post,
  Param,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import {
  CreatePurchaseDto,
  UpdatePurchaseStatusDto,
} from './dto/create-purchase.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { Role } from 'src/auth/enums/role.enum';
import { Roles } from 'src/auth/decorator/role.decorator';
import { GetUser, UserPayload } from 'src/auth/decorator/get-user.decorator';
import type { ListQuery } from 'src/common/pagination';

@ApiBearerAuth('access-token')
@UseGuards(JwtGuard, RolesGuard)
@ApiTags('Purchase')
@Controller('purchases')
export class PurchaseContoller {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'List purchase orders',
    description:
      'Returns all purchase orders with supplier, warehouse, and line item counts for purchase management screens.',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase orders retrieved successfully.',
  })
  async findAll(@GetUser() user: UserPayload, @Query() query: ListQuery) {
    return await this.purchaseService.findAll(user.tenantId, query);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Create a Purchase Order',
    description:
      'Initializes a new PO from a supplier. This does not increase inventory until the items are received.',
  })
  @ApiResponse({ status: 201, description: 'Purchase Order created.' })
  @ApiResponse({ status: 404, description: 'Supplier or Product not found.' })
  async create(@Body() dto: CreatePurchaseDto, @GetUser() user: UserPayload) {
    return await this.purchaseService.createPurchase(
      user.tenantId,
      user.userId,
      dto,
    );
  }

  @Patch(':id/receive')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Receive Goods',
    description:
      'Marks the PO as RECEIVED and triggers a positive StockMovement (Stock-In) in the ledger for each item.',
  })
  @ApiResponse({
    status: 200,
    description: 'Goods received and inventory updated.',
  })
  @ApiResponse({
    status: 400,
    description: 'Order already received or cancelled.',
  })
  async receive(
    @Param('id') id: string,
    @Body() dto: Partial<UpdatePurchaseStatusDto>,
    @GetUser() user: UserPayload,
  ) {
    return await this.purchaseService.recievePurchase(
      user.tenantId,
      user.userId,
      id,
      dto.expectedUpdatedAt,
    );
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Update purchase order status',
    description:
      'Changes purchase order state through the procurement lifecycle.',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase status updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid purchase status transition.',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseStatusDto,
    @GetUser() user: UserPayload,
  ) {
    return await this.purchaseService.updateStatus(
      user.tenantId,
      user.userId,
      id,
      dto.status,
      dto.expectedUpdatedAt,
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Get PO details',
    description:
      'Fetches the full details of a Purchase Order, including line items and delivery status.',
  })
  @ApiResponse({ status: 200, description: 'PO details retrieved.' })
  @ApiResponse({ status: 404, description: 'Purchase Order not found.' })
  async findOne(@Param('id') id: string, @GetUser() user: UserPayload) {
    return await this.purchaseService.getPurchaseDetails(user.tenantId, id);
  }
}
