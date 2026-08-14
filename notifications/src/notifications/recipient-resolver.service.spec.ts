import { BadRequestException } from '@nestjs/common';
import { NotificationTargetType } from '../common/enums/target-type.enum';
import { SharedDirectoryService } from '../database/shared-directory.service';
import { CreateInternalNotificationDto } from '../internal/dto/create-internal-notification.dto';
import { RecipientResolverService } from './recipient-resolver.service';

function dto(
  overrides: Partial<CreateInternalNotificationDto> = {},
): CreateInternalNotificationDto {
  return {
    type: 'PLAYER_CONVOCATED',
    title: 'Convocation',
    body: 'Vous êtes convoqué',
    ...overrides,
  };
}

describe('RecipientResolverService', () => {
  let directory: jest.Mocked<
    Pick<
      SharedDirectoryService,
      'isEnabled' | 'findActiveUserIdsByTeam' | 'findActiveUserIdsByRole'
    >
  >;
  let resolver: RecipientResolverService;

  beforeEach(() => {
    directory = {
      isEnabled: jest.fn().mockReturnValue(true),
      findActiveUserIdsByTeam: jest.fn(),
      findActiveUserIdsByRole: jest.fn(),
    };
    resolver = new RecipientResolverService(
      directory as unknown as SharedDirectoryService,
    );
  });

  it('resolves a single userId as-is', async () => {
    const result = await resolver.resolve(
      dto({ userId: 'user-1', teamId: 'team-ob' }),
    );
    expect(result).toEqual({ userIds: ['user-1'], teamId: 'team-ob' });
  });

  it('rejects both userId and target being provided', async () => {
    await expect(
      resolver.resolve(
        dto({
          userId: 'user-1',
          target: { type: NotificationTargetType.TEAM, teamId: 'team-ob' },
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when neither userId nor target is provided', async () => {
    await expect(resolver.resolve(dto())).rejects.toThrow(BadRequestException);
  });

  it('resolves TEAM targets via the shared directory', async () => {
    directory.findActiveUserIdsByTeam.mockResolvedValue(['u1', 'u2']);

    const result = await resolver.resolve(
      dto({ target: { type: NotificationTargetType.TEAM, teamId: 'team-ob' } }),
    );

    expect(directory.findActiveUserIdsByTeam).toHaveBeenCalledWith('team-ob');
    expect(result).toEqual({ userIds: ['u1', 'u2'], teamId: 'team-ob' });
  });

  it('resolves ROLE targets scoped to a team', async () => {
    directory.findActiveUserIdsByRole.mockResolvedValue(['coach-1']);

    const result = await resolver.resolve(
      dto({
        target: {
          type: NotificationTargetType.ROLE,
          role: 'ADMIN',
          teamId: 'team-ob',
        },
      }),
    );

    expect(directory.findActiveUserIdsByRole).toHaveBeenCalledWith(
      'ADMIN',
      'team-ob',
    );
    expect(result).toEqual({ userIds: ['coach-1'], teamId: 'team-ob' });
  });

  it('resolves MEMBERS targets to role=MEMBER', async () => {
    directory.findActiveUserIdsByRole.mockResolvedValue(['member-1']);

    await resolver.resolve(
      dto({ target: { type: NotificationTargetType.MEMBERS } }),
    );

    expect(directory.findActiveUserIdsByRole).toHaveBeenCalledWith(
      'MEMBER',
      undefined,
    );
  });

  it('requires pre-resolved userIds for CATEGORY targets (no football-specific logic, §32)', async () => {
    await expect(
      resolver.resolve(
        dto({
          target: { type: NotificationTargetType.CATEGORY, teamId: 'team-ob' },
        }),
      ),
    ).rejects.toThrow(BadRequestException);

    const result = await resolver.resolve(
      dto({
        target: {
          type: NotificationTargetType.CATEGORY,
          userIds: ['p1', 'p2'],
        },
      }),
    );
    expect(result.userIds).toEqual(['p1', 'p2']);
  });

  it('rejects TEAM/ROLE/MEMBERS targets when the shared directory is disabled', async () => {
    directory.isEnabled.mockReturnValue(false);

    await expect(
      resolver.resolve(
        dto({
          target: { type: NotificationTargetType.TEAM, teamId: 'team-ob' },
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
