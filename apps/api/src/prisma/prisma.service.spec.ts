const mockConnect = jest.fn();
const mockDisconnect = jest.fn();

jest.mock('@prisma/client', () => {
  class FakePrismaClient {
    constructor(public options?: unknown) {}
    $connect = mockConnect;
    $disconnect = mockDisconnect;
  }
  return { PrismaClient: FakePrismaClient };
});

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation((cfg: unknown) => ({ adapter: cfg })),
}));

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  const ORIGINAL_URL = process.env.DATABASE_URL;

  beforeEach(() => {
    mockConnect.mockReset();
    mockDisconnect.mockReset();
    (PrismaPg as unknown as jest.Mock).mockClear();
    process.env.DATABASE_URL = 'postgres://test';
  });

  afterAll(() => {
    if (ORIGINAL_URL === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = ORIGINAL_URL;
  });

  it('throws when DATABASE_URL is not set', () => {
    delete process.env.DATABASE_URL;
    expect(() => new PrismaService()).toThrow('DATABASE_URL is not set');
  });

  it('configures the Prisma adapter with the connection string', () => {
    new PrismaService();
    expect(PrismaPg).toHaveBeenCalledWith({
      connectionString: 'postgres://test',
    });
  });

  it('connects on module init', async () => {
    mockConnect.mockResolvedValueOnce(undefined);
    const svc = new PrismaService();
    await svc.onModuleInit();
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('retries until $connect succeeds', async () => {
    jest.useFakeTimers();
    try {
      mockConnect
        .mockRejectedValueOnce(new Error('first fail'))
        .mockRejectedValueOnce(new Error('second fail'))
        .mockResolvedValueOnce(undefined);

      const svc = new PrismaService();
      const promise = svc.onModuleInit();
      await jest.runAllTimersAsync();
      await promise;

      expect(mockConnect).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it('rethrows the last error when all attempts are exhausted', async () => {
    jest.useFakeTimers();
    try {
      mockConnect.mockRejectedValue(new Error('always fail'));
      const svc = new PrismaService();
      const promise = svc.onModuleInit();
      const assertion = expect(promise).rejects.toThrow('always fail');
      await jest.runAllTimersAsync();
      await assertion;
      expect(mockConnect).toHaveBeenCalledTimes(8);
    } finally {
      jest.useRealTimers();
    }
  });

  it('disconnects on module destroy', async () => {
    mockDisconnect.mockResolvedValueOnce(undefined);
    const svc = new PrismaService();
    await svc.onModuleDestroy();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
