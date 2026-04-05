import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
  findAll() {
    return this.ordersService.getOrders();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Get order details',
    description:
      'Retrieves a single order by id, including alll associated line items and product  details',
  })
  @ApiResponse({ status: 200, description: 'Order details found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Initialize a new order',
    description:
      'Creates a base order header linked to a Customer. Items must be added in a separate step.',
  })
  @ApiResponse({
    status: 201,
    description: 'Order header created successfully.',
  })
  @ApiResponse({ status: 404, description: 'Customer ID not found.' })
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto.customerId);
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
  addItem(@Param('id') orderId: string, @Body() dto: AddOrderItemDto) {
    const { productId, quantity, warehouseId } = dto;
    return this.ordersService.addItem(
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
  ) {
    return this.ordersService.updateStatus(orderId, dto.status);
  }
}
