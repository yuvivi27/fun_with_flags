import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

type RequestLike = {
  headers: { authorization?: string };
  user?: { sub: string; email: string };
};

function makeContext(request: RequestLike): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function makeJwt(impl: jest.Mock): JwtService {
  return { verifyAsync: impl } as unknown as JwtService;
}

describe('JwtAuthGuard', () => {
  it('throws when there is no authorization header', async () => {
    const guard = new JwtAuthGuard(makeJwt(jest.fn()));
    const ctx = makeContext({ headers: {} });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws when the auth scheme is not Bearer', async () => {
    const guard = new JwtAuthGuard(makeJwt(jest.fn()));
    const ctx = makeContext({ headers: { authorization: 'Basic something' } });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws when the token is missing after Bearer', async () => {
    const guard = new JwtAuthGuard(makeJwt(jest.fn()));
    const ctx = makeContext({ headers: { authorization: 'Bearer ' } });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches the user payload to the request on success', async () => {
    const verify = jest.fn().mockResolvedValue({
      sub: 'user-1',
      email: 'a@b.com',
    });
    const guard = new JwtAuthGuard(makeJwt(verify));
    const request: RequestLike = {
      headers: { authorization: 'Bearer real-token' },
    };
    const ctx = makeContext(request);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(verify).toHaveBeenCalledWith('real-token');
    expect(request.user).toEqual({ sub: 'user-1', email: 'a@b.com' });
  });

  it('rethrows verification errors as Unauthorized', async () => {
    const verify = jest.fn().mockRejectedValue(new Error('expired'));
    const guard = new JwtAuthGuard(makeJwt(verify));
    const ctx = makeContext({
      headers: { authorization: 'Bearer broken-token' },
    });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
