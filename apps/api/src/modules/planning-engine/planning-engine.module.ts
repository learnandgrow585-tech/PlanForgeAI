import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PlanningEngineService } from './planning-engine.service';

@Module({
  imports: [AiModule],
  providers: [PlanningEngineService],
  exports: [PlanningEngineService],
})
export class PlanningEngineModule {}
