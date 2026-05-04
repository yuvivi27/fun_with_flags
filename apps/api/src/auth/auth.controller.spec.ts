import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('AuthController', () => {
  const authServiceMock = {
    signup: jest.fn(),
    login: jest.fn(),
    me: jest.fn(),
  };

  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AuthController);
  });

  it('delegates signup to the service', async () => {
    authServiceMock.signup.mockResolvedValue({ accessToken: 'tok' });
    await expect(
      controller.signup({
        email: 'a@b.com',
        password: 'pw-12345',
      }),
    ).resolves.toEqual({ accessToken: 'tok' });
    expect(authServiceMock.signup).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pw-12345',
    });
  });

  it('delegates login to the service', async () => {
    authServiceMock.login.mockResolvedValue({ accessToken: 'tok' });
    await controller.login({ email: 'x@y.com', password: 'pw-12345' });
    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'x@y.com',
      password: 'pw-12345',
    });
  });

  it('passes the current user id to me', async () => {
    authServiceMock.me.mockResolvedValue({ id: 'user-1' });
    await controller.me({ sub: 'user-1' });
    expect(authServiceMock.me).toHaveBeenCalledWith('user-1');
  });
});
