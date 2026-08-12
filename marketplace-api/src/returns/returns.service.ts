import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReturnRequest } from './entities/return-request.entity';

/** Scaffolding (TS-03) — workflow REQUESTED -> APPROVED/REJECTED -> COMPLETED à venir avec E16. */
@Injectable()
export class ReturnsService {
  constructor(
    @InjectRepository(ReturnRequest)
    private readonly repository: Repository<ReturnRequest>,
  ) {}

  async findAllForSeller(sellerId: string): Promise<ReturnRequest[]> {
    return this.repository.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });
  }
}
