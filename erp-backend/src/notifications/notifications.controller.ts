import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { Roles } from 'src/auth/decorator/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { GetUser, UserPayload } from 'src/auth/decorator/get-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiBearerAuth('access-token')
@UseGuards(JwtGuard, RolesGuard)
@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({ summary: 'List notifications for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully.',
  })
  list(@GetUser() user: UserPayload, @Query('limit') limit?: string) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.notificationsService.listForUser(
      user.tenantId,
      user.userId,
      Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    );
  }

  @Get('unread-count')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Get unread notification count for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully.',
  })
  unreadCount(@GetUser() user: UserPayload) {
    return this.notificationsService.getUnreadCount(user.tenantId, user.userId);
  }

  @Patch('read-all')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Mark all notifications as read for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read.',
  })
  markAllAsRead(@GetUser() user: UserPayload) {
    return this.notificationsService.markAllAsRead(user.tenantId, user.userId);
  }

  @Patch(':id/read')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read.' })
  markAsRead(
    @Param('id', ParseUUIDPipe) notificationId: string,
    @GetUser() user: UserPayload,
  ) {
    return this.notificationsService.markAsRead(
      user.tenantId,
      user.userId,
      notificationId,
    );
  }
}
