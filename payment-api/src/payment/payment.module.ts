import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { KonnectController } from './providers/konnect/konnect.controller';
import { KonnectModule } from './providers/konnect/konnect.module';
import { PaymeeController } from './providers/paymee/paymee.controller';
import { PaymeeModule } from './providers/paymee/paymee.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), KonnectModule, PaymeeModule],
  controllers: [PaymentController, KonnectController, PaymeeController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
