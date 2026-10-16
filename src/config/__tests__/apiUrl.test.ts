import { resolveApiUrl } from '../apiUrl';
it('keeps local development explicit and accepts HTTPS production API paths', () => {
  expect(resolveApiUrl(undefined, true)).toBe('http://localhost:4000');
  expect(resolveApiUrl('https://api.example.test/v1/', false)).toBe('https://api.example.test/v1');
});
it.each([undefined, 'http://api.example.test', 'https://localhost', 'https://127.0.0.1', 'https://192.168.1.2', 'https://172.16.0.2', 'https://[::1]', 'https://user:password@api.example.test', 'https://api.example.test?secret=x'])('rejects unsafe store API URL %s', value => {
  expect(() => resolveApiUrl(value, false)).toThrow();
});
