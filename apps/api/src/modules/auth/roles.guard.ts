import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Checks the user's role against the @Roles(...) metadata. Reads the role from
 * the database (not the JWT) so role changes take effect immediately, without
 * the user needing to log out and back in.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = ctx.switchToHttp().getRequest();
    if (!user?.sub) throw new ForbiddenException('Insufficient permissions');

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { role: true, isActive: true },
    });
    if (!dbUser || !dbUser.isActive || !required.includes(dbUser.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
