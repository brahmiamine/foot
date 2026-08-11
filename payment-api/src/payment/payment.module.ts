import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { KonnectController } from './providers/konnect/konnect.controller';
import { KonnectModule } from './providers/konnect/konnect.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), KonnectModule],
  controllers: [PaymentController, KonnectController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
