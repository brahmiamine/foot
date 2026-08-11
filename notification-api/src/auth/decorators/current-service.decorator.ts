import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedService } from '../../common/interfaces/authenticated-user.interface';

/** Application backend authentifiée ayant appelé un endpoint /internal/*. */
export const CurrentService = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedService => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ service: AuthenticatedService }>();
    return request.service;
  },
);
