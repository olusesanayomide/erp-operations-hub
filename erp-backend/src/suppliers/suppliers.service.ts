import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { UserPayload } from 'src/auth/decorator/get-user.decorator';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(createSupplierDto: CreateSupplierDto, user: UserPayload) {
    return this.prisma.supplier.create({
      data: {
        ...createSupplierDto,
        tenantId: user.tenantId,
      },
    });
  }

  async findAll(user: UserPayload) {
    return this.prisma.supplier.findMany({
      where: { tenantId: user.tenantId },
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    });
  }

  async findOne(id: string, user: UserPayload) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { purchases: true },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto, user: UserPayload) {
    await this.findOne(id, user);

    return this.prisma.supplier.update({
      where: { id },
      data: updateSupplierDto,
    });
  }

  async remove(id: string, user: UserPayload) {
    await this.findOne(id, user);

    return this.prisma.supplier.delete({
      where: { id },
    });
  }
}
