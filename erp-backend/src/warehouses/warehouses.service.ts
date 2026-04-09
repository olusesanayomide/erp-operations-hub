import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { PrismaService } from 'prisma/prisma.service';
import { UserPayload } from 'src/auth/decorator/get-user.decorator';

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  async create(createWarehouseDto: CreateWarehouseDto, user: UserPayload) {
    return this.prisma.warehouse.create({
      data: {
        ...createWarehouseDto,
        tenantId: user.tenantId,
      },
    });
  }

  async findAll(user: UserPayload) {
    return this.prisma.warehouse.findMany({
      where: { tenantId: user.tenantId },
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    });
  }

  async findOne(id: string, user: UserPayload) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId: user.tenantId },
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

  async update(id: string, updateWarehouseDto: UpdateWarehouseDto, user: UserPayload) {
    await this.findOne(id, user);

    return this.prisma.warehouse.update({
      where: { id },
      data: updateWarehouseDto,
    });
  }

  async remove(id: string, user: UserPayload) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId: user.tenantId },
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
