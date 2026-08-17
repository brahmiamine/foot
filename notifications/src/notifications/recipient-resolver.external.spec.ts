import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { SharedDirectoryService } from '../database/shared-directory.service';
import { RecipientResolverService } from './recipient-resolver.service';

describe('RecipientResolverService external email', () => {
  const directory = {
    isEnabled: jest.fn().mockReturnValue(false),
  } as unknown as SharedDirectoryService;
  const resolver = new RecipientResolverService(directory);

  it('resolves an external applicant without a directory account', async () => {
    const email = 'Applicant@Example.com';
    const digest = createHash('sha256')
      .update(email.toLowerCase())
      .digest('hex');

    const result = await resolver.resolve({
      type: 'SELLER_APPLICATION_APPROVED',
      title: 'Approved',
      body: 'Activate your account',
      email,
      teamId: 'club-1',
    });

    expect(result).toEqual({
      userIds: [`external-email:${digest}`],
      teamId: 'club-1',
    });
  });

  it('rejects mixing an external email with another recipient mode', async () => {
    await expect(
      resolver.resolve({
        type: 'SELLER_APPLICATION_APPROVED',
        title: 'Approved',
        body: 'Activate your account',
        email: 'applicant@example.com',
        userId: 'user-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
