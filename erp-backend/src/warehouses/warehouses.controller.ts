import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { Roles } from 'src/auth/decorator/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { GetUser, UserPayload } from 'src/auth/decorator/get-user.decorator';

@ApiBearerAuth('access-token')
@UseGuards(JwtGuard, RolesGuard)
@ApiTags('Master Data: Warehouses')
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Create a new warehouse',
    description: 'Registers a physical or virtual storage location.',
  })
  @ApiResponse({ status: 201, description: 'Warehouse created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid data provided.' })
  create(@Body() createWarehouseDto: CreateWarehouseDto, @GetUser() user: UserPayload) {
    return this.warehousesService.create(createWarehouseDto, user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'List all warehouses',
    description:
      'Retrieves all locations including a count of their inventory items.',
  })
  @ApiResponse({ status: 200, description: 'Return all warehouses.' })
  findAll(@GetUser() user: UserPayload) {
    return this.warehousesService.findAll(user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Get warehouse details',
    description:
      'Returns a specific warehouse with a list of all products currently in stock.',
  })
  @ApiResponse({ status: 200, description: 'Warehouse found.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: UserPayload) {
    return this.warehousesService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Update warehouse',
    description: 'Update the name or location of an existing warehouse.',
  })
  @ApiResponse({ status: 200, description: 'Warehouse updated successfully.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWarehouseDto: UpdateWarehouseDto,
    @GetUser() user: UserPayload,
  ) {
    return this.warehousesService.update(id, updateWarehouseDto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Delete warehouse',
    description:
      'Removes a warehouse. Will fail if the warehouse currently contains stock.',
  })
  @ApiResponse({ status: 200, description: 'Warehouse deleted successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete warehouse with active inventory.',
  })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: UserPayload) {
    return this.warehousesService.remove(id, user);
  }
}
