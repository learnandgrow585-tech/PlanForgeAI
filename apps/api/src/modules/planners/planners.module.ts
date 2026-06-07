import { Module } from '@nestjs/common';
import { PlannersController } from './planners.controller';

@Module({
  controllers: [PlannersController],
})
export class PlannersModule {}
