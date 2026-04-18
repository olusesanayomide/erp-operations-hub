import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './order.service';
import {
  CreateOrderDto,
  AddOrderItemDto,
  UpdateOrderStatusDto,
} from './dto/order.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorator/role.decorator';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { Role } from 'src/auth/enums/role.enum';
import { GetUser, UserPayload } from 'src/auth/decorator/get-user.decorator';
import type { ListQuery } from 'src/common/pagination';

@ApiBearerAuth('access-token')
@UseGuards(JwtGuard, RolesGuard)
@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'List all orders',
    description:
      'Returns a history of all customer orders, including their current statuses (PENDING, SHIPPED, etc.).',
  })
  @ApiResponse({ status: 200, description: 'List of orders retrieved.' })
  findAll(@GetUser() user: UserPayload, @Query() query: ListQuery) {
    return this.ordersService.getOrders(user.tenantId, query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Get order details',
    description:
      'Retrieves a single order by id, including alll associated line items and product  details',
  })
  @ApiResponse({ status: 200, description: 'Order details found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: UserPayload,
  ) {
    return this.ordersService.getOrderById(user.tenantId, id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Create a new draft order',
    description:
      'Creates an order header and its draft line items in a single atomic request.',
  })
  @ApiResponse({
    status: 201,
    description: 'Draft order created successfully.',
  })
  @ApiResponse({ status: 404, description: 'Customer ID not found.' })
  create(@Body() dto: CreateOrderDto, @GetUser() user: UserPayload) {
    return this.ordersService.createOrder(user.tenantId, user.userId, dto);
  }

  @Post(':id/items')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Add item to order',
    description:
      'Appends a product to an existing draft order. Stock is deducted when the order is confirmed.',
  })
  @ApiResponse({ status: 201, description: 'Item added to order.' })
  @ApiResponse({ status: 404, description: 'Order or Product not found.' })
  addItem(
    @Param('id') orderId: string,
    @Body() dto: AddOrderItemDto,
    @GetUser() user: UserPayload,
  ) {
    const { productId, quantity, warehouseId } = dto;
    return this.ordersService.addItem(
      user.tenantId,
      orderId,
      productId,
      quantity,
      warehouseId,
    );
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Update order status',
    description:
      'Changes order state through the operational lifecycle: DRAFT -> CONFIRMED -> PICKED -> SHIPPED -> DELIVERED.',
  })
  @ApiResponse({ status: 200, description: 'Status updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid status transition.' })
  updateStatus(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateOrderStatusDto,
    @GetUser() user: UserPayload,
  ) {
    return this.ordersService.updateStatus(
      user.tenantId,
      user.userId,
      orderId,
      dto.status,
    );
  }
}
