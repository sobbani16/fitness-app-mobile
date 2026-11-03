jest.mock('../../config/buildInfo', () => ({ clientBuild: () => '1.0.0(42)', CLIENT_API_CONTRACT: 2 }));
import { endpointLabel, classifyFailure, recordFailure, recentFailures, diagnosticReport, noteServerContract, compatibility, resetDiagnostics } from '../apiDiagnostics';

beforeEach(resetDiagnostics);
it('strips identifiers and query values from endpoints', () => {
  expect(endpointLabel('https://api.example.com/food-logs/3f2c1a9e-1111-4222-8333-444455556666?date=2026-11-02')).toBe('/food-logs/:id');
  expect(endpointLabel('/users/12345/profile?email=a@b.c')).toBe('/users/:id/profile');
});
it.each([
  [{ isAxiosError: true }, 'network'], [{ code: 'ECONNABORTED' }, 'timeout'], [{ response: { status: 400 } }, 'validation'],
  [{ response: { status: 401 } }, 'auth'], [{ response: { status: 403 } }, 'forbidden'], [{ response: { status: 404 } }, 'not_found'],
  [{ response: { status: 409 } }, 'conflict'], [{ response: { status: 426 } }, 'upgrade_required'], [{ response: { status: 429 } }, 'rate_limited'],
  [{ response: { status: 500 } }, 'server'], [{ response: { status: 503 } }, 'unavailable'],
])('classifies %j as %s', (error, category) => { expect(classifyFailure(error)).toBe(category); });
it('records only sanitized metadata', () => {
  recordFailure({ config: { method: 'post', url: '/food-logs?date=2026-11-02', headers: { Authorization: 'Bearer secret', 'x-correlation-id': 'm-abc' }, data: '{"name":"Pizza"}', metadata: { startedAt: Date.now() - 50 } },
    response: { status: 400, data: { code: 'VALIDATION_ERROR', error: 'calories invalid', name: 'Pizza' }, headers: { 'x-api-contract': '2' } } });
  const report = diagnosticReport();
  expect(recentFailures()[0]).toMatchObject({ method: 'POST', endpoint: '/food-logs', status: 400, code: 'VALIDATION_ERROR', correlationId: 'm-abc' });
  expect(report).not.toMatch(/secret|Pizza|2026-11-02 |calories invalid/);
  expect(report).toMatch(/build 1\.0\.0\(42\)/);
});
it('detects backend/mobile contract mismatch', () => {
  expect(compatibility()).toBe('unknown');
  noteServerContract({ 'x-api-contract': '1' });
  expect(compatibility()).toBe('server_outdated');
  noteServerContract({ 'x-api-contract': '3', 'x-min-client-contract': '3' });
  expect(compatibility()).toBe('update_app');
  noteServerContract({ 'x-api-contract': '2', 'x-min-client-contract': '1' });
  expect(compatibility()).toBe('compatible');
});
