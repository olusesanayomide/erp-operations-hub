import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductService } from './product.service';
import { Product } from '@prisma/client';
import {
  ProductDto,
  ProductImportDto,
  UpdateProductDto,
} from './dto/product.dto';
import { Roles } from 'src/auth/decorator/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';

@ApiBearerAuth('access-token')
@UseGuards(JwtGuard, RolesGuard)
@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  //   get all products
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'List all products',
    description:
      'Retrieves the full catalog of products available in the system.',
  })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully.' })
  async getAllProducts() {
    return this.productService.getAll();
  }

  @Post('import/preview')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Preview a products CSV import',
    description:
      'Validates a CSV file, identifies row-level issues, and shows whether each SKU will create or update a product.',
  })
  @ApiResponse({
    status: 200,
    description: 'Import preview generated successfully.',
  })
  async previewImport(@Body() dto: ProductImportDto) {
    return this.productService.previewImport(dto.csv, dto.mode ?? 'upsert');
  }

  @Post('import/commit')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Commit a products CSV import',
    description:
      'Creates or updates products from a validated CSV using SKU as the import key.',
  })
  @ApiResponse({
    status: 201,
    description: 'Products imported successfully.',
  })
  async commitImport(@Body() dto: ProductImportDto) {
    return this.productService.commitImport(dto.csv, dto.mode ?? 'upsert');
  }

  //   get product by id
  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Get product by ID',
    description:
      'Fetches detailed information about a specific product using its UUID.',
  })
  @ApiResponse({ status: 200, description: 'Product found.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async getProductById(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.getById(id);
  }

  //   create product
  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Create a new product',
    description:
      'Adds a new item to the master catalog. This does not set stock levels (use Inventory Stock-In for that).',
  })
  @ApiResponse({ status: 201, description: 'Product created successfully.' })
  async create(@Body() dto: ProductDto): Promise<Product> {
    return this.productService.createproduct(dto);
  }

  // Update a product
  @Put(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Update product details',
    description:
      'Modifies existing product information like name, SKU, or base price.',
  })
  @ApiResponse({ status: 200, description: 'Product updated successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.productService.updateProduct(id, dto);
  }

  //  Delete a product
  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Archive/Delete product',
    description:
      'Removes a product from the catalog. Note: This may fail if the product has existing transaction history.',
  })
  @ApiResponse({ status: 200, description: 'Product deleted successfully.' })
  @ApiResponse({
    status: 409,
    description: 'Conflict: Product is linked to existing orders.',
  })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
    return this.productService.deleteProduct(id);
  }
}
