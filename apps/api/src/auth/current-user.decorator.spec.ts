import 'reflect-metadata';
import type { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './current-user.decorator';

type ParamFactory = (data: unknown, ctx: ExecutionContext) => unknown;

function getDecoratorFactory(): ParamFactory {
  class Holder {
    method(@CurrentUser() _user: unknown): void {}
  }
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Holder, 'method') as
    | Record<string, { factory: ParamFactory }>
    | undefined;
  if (!args) throw new Error('Decorator metadata missing');
  const entry = Object.values(args)[0];
  if (!entry) throw new Error('Decorator metadata had no entries');
  return entry.factory;
}

describe('CurrentUser decorator', () => {
  it('returns request.user from the execution context', () => {
    const factory = getDecoratorFactory();
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { sub: 'user-1', email: 'a@b.com' } }),
      }),
    } as unknown as ExecutionContext;

    expect(factory(undefined, ctx)).toEqual({
      sub: 'user-1',
      email: 'a@b.com',
    });
  });

  it('returns undefined when the request has no user', () => {
    const factory = getDecoratorFactory();
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as unknown as ExecutionContext;
    expect(factory(undefined, ctx)).toBeUndefined();
  });
});
