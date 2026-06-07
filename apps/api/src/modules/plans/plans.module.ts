import { Module } from '@nestjs/common';
import { PlanningEngineModule } from '../planning-engine/planning-engine.module';
import { AuthModule } from '../auth/auth.module';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

@Module({
  imports: [PlanningEngineModule, AuthModule],
  controllers: [PlansController],
  providers: [PlansService],
})
export class PlansModule {}
