import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../payment/entities/payment.entity';
import { Refund } from '../refund/entities/refund.entity';
import { FinancialLedgerController } from './financial-ledger.controller';
import { FinancialLedgerService } from './financial-ledger.service';
import { FinancialLedgerEntry } from './entities/financial-ledger-entry.entity';
import { PaymentFinancialAllocation } from './entities/payment-financial-allocation.entity';
import { FinancialOperatorGuard } from './guards/financial-operator.guard';
import { SettlementWriterGuard } from './guards/settlement-writer.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Refund,
      FinancialLedgerEntry,
      PaymentFinancialAllocation,
    ]),
  ],
  controllers: [FinancialLedgerController],
  providers: [
    FinancialLedgerService,
    FinancialOperatorGuard,
    SettlementWriterGuard,
  ],
  exports: [FinancialLedgerService],
})
export class FinancialLedgerModule {}
