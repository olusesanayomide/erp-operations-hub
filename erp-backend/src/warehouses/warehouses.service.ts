import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  async create(createWarehouseDto: CreateWarehouseDto) {
    return this.prisma.warehouse.create({
      data: createWarehouseDto,
    });
  }

  async findAll() {
    const data = await this.prisma.warehouse.findMany({
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    });
    console.log('Warehouse in DB ', data);
    return data;
  }

  async findOne(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        inventoryItems: {
          include: {
            product: true,
          },
        },
      },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }
    return warehouse;
  }

  async update(id: string, updateWarehouseDto: UpdateWarehouseDto) {
    return this.prisma.warehouse.update({
      where: { id },
      data: updateWarehouseDto,
    });
  }

  async remove(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            inventoryItems: true,
            purchases: true,
          },
        },
      },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }
    if (warehouse._count.inventoryItems > 0) {
      throw new BadRequestException(
        'Cannot delete  warehouse: It still contains, inventory . Move stock to another stock location ',
      );
    }
    return this.prisma.warehouse.delete({ where: { id } });
  }
}
