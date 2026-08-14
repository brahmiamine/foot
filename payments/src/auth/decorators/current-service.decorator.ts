import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedService } from '../interfaces/authenticated-service.interface';

/** Application backend authentifiée ayant appelé un endpoint protégé par ServiceAuthGuard. */
export const CurrentService = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedService => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ service: AuthenticatedService }>();
    return request.service;
  },
);
