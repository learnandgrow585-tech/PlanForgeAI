import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { CacheModule } from './cache/cache.module';
import { EmailModule } from './email/email.module';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { PlanningEngineModule } from './modules/planning-engine/planning-engine.module';
import { PlannersModule } from './modules/planners/planners.module';
import { PlansModule } from './modules/plans/plans.module';
import { AdminModule } from './modules/admin/admin.module';
import { KnowledgeHubModule } from './modules/knowledge-hub/knowledge-hub.module';
import { SearchModule } from './modules/search/search.module';
import { BlogModule } from './modules/blog/blog.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    CacheModule,
    EmailModule,
    AiModule,
    AuthModule,
    PlanningEngineModule,
    PlannersModule,
    PlansModule,
    AdminModule,
    KnowledgeHubModule,
    SearchModule,
    BlogModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
