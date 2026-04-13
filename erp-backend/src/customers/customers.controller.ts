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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerImportDto } from './dto/customer-import.dto';
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
@ApiTags('Master Data : Customer')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Register a new customer',
    description:
      'Creates a customer record in the registry for sales transactions.',
  })
  @ApiResponse({ status: 201, description: 'Customer created successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or Email already exists.',
  })
  create(
    @Body() createCustomerDto: CreateCustomerDto,
    @GetUser() user: UserPayload,
  ) {
    return this.customersService.create(createCustomerDto, user);
  }

  @Post('import/preview')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Preview a customers CSV import',
    description:
      'Validates a CSV file, reports row-level issues, and shows whether each email will create or update a customer.',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer import preview generated successfully.',
  })
  previewImport(@Body() dto: CustomerImportDto, @GetUser() user: UserPayload) {
    return this.customersService.previewImport(
      dto.csv,
      user,
      dto.mode ?? 'upsert',
    );
  }

  @Post('import/commit')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Commit a customers CSV import',
    description:
      'Creates or updates customers from a validated CSV using email as the import key.',
  })
  @ApiResponse({
    status: 201,
    description: 'Customers imported successfully.',
  })
  commitImport(@Body() dto: CustomerImportDto, @GetUser() user: UserPayload) {
    return this.customersService.commitImport(
      dto.csv,
      user,
      dto.mode ?? 'upsert',
    );
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'List all customers',
    description:
      'Returns a list of all registered customers with their total order counts.',
  })
  @ApiResponse({ status: 200, description: 'List retrieved successfully.' })
  findAll(@GetUser() user: UserPayload) {
    return this.customersService.findAll(user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Get customer by ID',
    description:
      'Returns full profile and order history for a specific customer.',
  })
  @ApiResponse({ status: 200, description: 'Customer found.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: UserPayload,
  ) {
    return this.customersService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Update customer details',
    description: 'Partially update customer contact info or name.',
  })
  @ApiResponse({ status: 200, description: 'Customer updated successfully.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @GetUser() user: UserPayload,
  ) {
    return this.customersService.update(id, updateCustomerDto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Remove customer',
    description:
      'Deletes a customer from the registry. Fails if customer has existing orders.',
  })
  @ApiResponse({ status: 200, description: 'Customer deleted successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete customer with order history.',
  })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: UserPayload) {
    return this.customersService.remove(id, user);
  }
}
