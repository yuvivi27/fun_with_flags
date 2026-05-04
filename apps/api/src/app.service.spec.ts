import { AppService } from './app.service';

describe('AppService', () => {
  it('returns the hello world greeting', () => {
    expect(new AppService().getHello()).toBe('Hello World!');
  });
});
