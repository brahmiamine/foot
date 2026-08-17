/* eslint-disable @typescript-eslint/no-unsafe-return */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { CentralNotificationsClient } from '../notifications/central-notifications.client';
import { NotificationsService } from '../notifications/notifications.service';
import { MarketplaceClubSettings } from './entities/marketplace-club-settings.entity';
import { SellerApplication } from './entities/seller-application.entity';
import { SellerInvite } from './entities/seller-invite.entity';
import { Seller } from './entities/seller.entity';
import { SellerUser } from './entities/seller-user.entity';
import { SellerApplicationStatus } from './enums/seller-application-status.enum';
import { SellerStatus } from './enums/seller-status.enum';
import { SellersService } from './sellers.service';

describe('SellersService governance', () => {
  let sellerRepository: { findOne: jest.Mock; save: jest.Mock };
  let applicationRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let settingsRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let centralNotifications: {
    notifyClubAdmins: jest.Mock;
    notifyExternalEmail: jest.Mock;
  };
  let service: SellersService;

  beforeEach(() => {
    sellerRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    applicationRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((value) => ({ id: 'application-1', ...value })),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    settingsRepository = {
      findOne: jest.fn().mockResolvedValue({
        clubId: 'club-1',
        sellerApplicationsEnabled: true,
        sellerApprovalRequired: true,
        productApprovalRequired: true,
        productReapprovalOnSensitiveChange: true,
      }),
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    centralNotifications = {
      notifyClubAdmins: jest.fn().mockResolvedValue(undefined),
      notifyExternalEmail: jest.fn().mockResolvedValue(undefined),
    };

    service = new SellersService(
      sellerRepository as unknown as Repository<Seller>,
      { findOne: jest.fn() } as unknown as Repository<SellerUser>,
      applicationRepository as unknown as Repository<SellerApplication>,
      { findOne: jest.fn() } as unknown as Repository<SellerInvite>,
      settingsRepository as unknown as Repository<MarketplaceClubSettings>,
      { transaction: jest.fn() } as unknown as DataSource,
      { get: jest.fn() } as unknown as ConfigService,
      centralNotifications as unknown as CentralNotificationsClient,
      { notify: jest.fn() } as unknown as NotificationsService,
    );
  });

  it('creates a pending application without creating a seller', async () => {
    const result = await service.createApplication({
      clubId: 'club-1',
      businessName: 'Boutique Test',
      ownerName: 'Owner Test',
      email: 'OWNER@example.com',
    });

    expect(result.status).toBe(SellerApplicationStatus.PENDING);
    expect(result.email).toBe('owner@example.com');
    expect(sellerRepository.save).not.toHaveBeenCalled();
    expect(centralNotifications.notifyClubAdmins).toHaveBeenCalledWith(
      'club-1',
      'SELLER_APPLICATION_CREATED',
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ applicationId: 'application-1' }),
      'seller-application:application-1:created',
    );
  });

  it('refuses a duplicate application already under review', async () => {
    applicationRepository.findOne.mockResolvedValue({ id: 'existing' });

    await expect(
      service.createApplication({
        clubId: 'club-1',
        businessName: 'Boutique Test',
        ownerName: 'Owner Test',
        email: 'owner@example.com',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('requires a rejection reason', async () => {
    await expect(
      service.rejectApplication('application-1', 'club-1', 'admin-1', '  '),
    ).rejects.toThrow(ConflictException);
  });

  it('scopes commission updates by seller id and club id', async () => {
    sellerRepository.findOne.mockResolvedValue({
      id: 'seller-1',
      clubId: 'club-1',
      status: SellerStatus.ACTIVE,
      commissionRate: '10.00',
    });

    const updated = await service.updateCommission('seller-1', 'club-1', 12.5);

    expect(sellerRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'seller-1', clubId: 'club-1' },
    });
    expect(updated.commissionRate).toBe('12.50');
  });

  it('rejects commission updates for a seller outside the club', async () => {
    sellerRepository.findOne.mockResolvedValue(null);

    await expect(
      service.updateCommission('seller-1', 'club-2', 12.5),
    ).rejects.toThrow(NotFoundException);
  });
});
