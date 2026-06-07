import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BlogController } from './blog.controller';
import { BlogAdminController } from './blog-admin.controller';
import { BlogService } from './blog.service';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [AuthModule],
  controllers: [BlogController, BlogAdminController],
  providers: [BlogService, RolesGuard],
})
export class BlogModule {}
