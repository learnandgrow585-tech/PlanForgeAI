import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { KnowledgeHubController } from './knowledge-hub.controller';
import { KnowledgeHubService } from './knowledge-hub.service';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [KnowledgeHubController],
  providers: [KnowledgeHubService],
})
export class KnowledgeHubModule {}
