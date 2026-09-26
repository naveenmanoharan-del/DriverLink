/**
 * End-to-end API test suite.
 *
 * Exercises every controller route against a *running* server: registration and
 * login, role guards, client job requirements (and that job browsing, applying
 * and reviews are gone), token refresh, input validation and rate limiting.
 *
 * Usage:
 *   npm run test:api                       # against http://localhost:3000/api
 *   API_URL=https://host/api npm run test:api
 *
 * Requires the server and its database to be up. Exits non-zero on any failure
 * so it can gate a deploy.
 *
 * Note: the rate-limiting section deliberately trips the login limiter, so it
 * runs last — logins immediately afterwards will be throttled for the window.
 */
const API = process.env.API_URL ?? 'http://localhost:3000/api';

let pass = 0,
  fail = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(t) {
  console.log(`\n=== ${t} ===`);
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: res.status, data };
}

const stamp = Date.now().toString().slice(-9);
const clientPhone = `+91900${stamp}`;
const workerPhone = `+91800${stamp}`;
const PASSWORD = 'testpass123';

const state = {};

async function run() {
  section('Health & public endpoints');
  const health = await api('/health');
  check('GET /health returns 200', health.status === 200, `got ${health.status}`);

  const cats = await api('/v1/categories');
  check('GET /v1/categories returns 200', cats.status === 200, `got ${cats.status}`);
  check('categories seeded (>0)', Array.isArray(cats.data) && cats.data.length > 0, `got ${cats.data?.length}`);
  const groups = [...new Set((cats.data || []).map((c) => c.group))];
  check(
    'exactly the 3 consultancy groups are active',
    groups.length === 3 &&
      ['key_personnel', 'technical_staff', 'support_staff'].every((g) => groups.includes(g)),
    `groups: ${groups.join(',')}`,
  );
  state.categoryId = cats.data[0].id;
  state.categoryId2 = cats.data.find((c) => c.group === 'driver')?.id ?? cats.data[1].id;

  section('Registration');
  const regClient = await api('/v1/auth/register/client', {
    method: 'POST',
    body: {
      phone: clientPhone,
      password: PASSWORD,
      name: 'E2E Client',
      clientType: 'company',
      companyName: 'E2E Corp',
      city: 'Chennai',
    },
  });
  check('register client 201', regClient.status === 201, `got ${regClient.status} ${JSON.stringify(regClient.data)}`);
  check('client got accessToken', !!regClient.data?.accessToken);
  check('client role is client', regClient.data?.user?.role === 'client', `got ${regClient.data?.user?.role}`);
  state.clientToken = regClient.data?.accessToken;
  state.clientRefresh = regClient.data?.refreshToken;
  state.clientId = regClient.data?.user?.id;

  const regWorker = await api('/v1/auth/register/worker', {
    method: 'POST',
    body: {
      phone: workerPhone,
      password: PASSWORD,
      firstName: 'E2E',
      lastName: 'Worker',
      categoryId: state.categoryId,
      yearsExperience: 5,
      minRate: '750',
      rateUnit: 'day',
      city: 'Chennai',
    },
  });
  check('register worker 201', regWorker.status === 201, `got ${regWorker.status} ${JSON.stringify(regWorker.data)}`);
  check('worker role is worker', regWorker.data?.user?.role === 'worker', `got ${regWorker.data?.user?.role}`);
  state.workerToken = regWorker.data?.accessToken;
  state.workerId = regWorker.data?.user?.id;

  const dupe = await api('/v1/auth/register/client', {
    method: 'POST',
    body: { phone: clientPhone, password: PASSWORD, name: 'Dupe', clientType: 'individual' },
  });
  check('duplicate phone rejected (4xx)', dupe.status >= 400 && dupe.status < 500, `got ${dupe.status}`);

  section('Login & session');
  const login = await api('/v1/auth/login', { method: 'POST', body: { phone: clientPhone, password: PASSWORD } });
  check('login with correct creds 200/201', [200, 201].includes(login.status), `got ${login.status}`);
  check('login returns token', !!login.data?.accessToken);
  state.clientToken = login.data?.accessToken || state.clientToken;

  const badLogin = await api('/v1/auth/login', { method: 'POST', body: { phone: clientPhone, password: 'wrongpass' } });
  check('login with wrong password 401', badLogin.status === 401, `got ${badLogin.status}`);

  const me = await api('/v1/auth/me', { token: state.clientToken });
  check('GET /v1/auth/me 200', me.status === 200, `got ${me.status}`);
  check('me returns same phone', me.data?.user?.phone === clientPhone, `got ${me.data?.user?.phone}`);
  check('me returns attached profile', !!me.data?.profile, 'profile missing');

  const noAuth = await api('/v1/auth/me');
  check('GET /v1/auth/me without token 401', noAuth.status === 401, `got ${noAuth.status}`);

  const refreshed = await api('/v1/auth/refresh', { method: 'POST', body: { refreshToken: state.clientRefresh } });
  check('refresh token works', [200, 201].includes(refreshed.status) && !!refreshed.data?.accessToken, `got ${refreshed.status}`);
  // Refreshing rotates the token: the one just used is now revoked, so track
  // the replacement or every later refresh in this run fails.
  state.clientRefresh = refreshed.data?.refreshToken ?? state.clientRefresh;

  section('Profiles (worker & client)');
  const wMe = await api('/v1/workers/me', { token: state.workerToken });
  check('GET /v1/workers/me 200', wMe.status === 200, `got ${wMe.status}`);
  check('worker profile has minRate', wMe.data?.minRate != null, JSON.stringify(wMe.data));
  state.workerProfileId = wMe.data?.id;

  const wUpdate = await api('/v1/workers/me', {
    method: 'PUT',
    token: state.workerToken,
    body: { minRate: '900', yearsExperience: 7, city: 'Bengaluru', availability: 'available' },
  });
  check('PUT /v1/workers/me 200', wUpdate.status === 200, `got ${wUpdate.status} ${JSON.stringify(wUpdate.data)}`);
  const wMe2 = await api('/v1/workers/me', { token: state.workerToken });
  check('worker update persisted (minRate=900)', String(wMe2.data?.minRate) === '900.00' || String(wMe2.data?.minRate) === '900', `got ${wMe2.data?.minRate}`);
  check('worker update persisted (city)', wMe2.data?.city === 'Bengaluru', `got ${wMe2.data?.city}`);

  const cMe = await api('/v1/clients/me', { token: state.clientToken });
  check('GET /v1/clients/me 200', cMe.status === 200, `got ${cMe.status}`);
  const cUpdate = await api('/v1/clients/me', {
    method: 'PUT',
    token: state.clientToken,
    body: { name: 'E2E Client Renamed', city: 'Mumbai' },
  });
  check('PUT /v1/clients/me 200', cUpdate.status === 200, `got ${cUpdate.status}`);
  const cMe2 = await api('/v1/clients/me', { token: state.clientToken });
  check('client update persisted', cMe2.data?.city === 'Mumbai', `got ${cMe2.data?.city}`);

  section('Worker directory');
  const wList = await api('/v1/workers', { token: state.clientToken });
  check('GET /v1/workers 200', wList.status === 200, `got ${wList.status}`);
  check('GET /v1/workers is paginated {data,page,pageSize}', Array.isArray(wList.data?.data) && wList.data?.page != null, JSON.stringify(wList.data).slice(0, 120));
  check('worker directory includes our worker', (wList.data?.data || []).some((w) => w.id === state.workerProfileId));
  const wOne = await api(`/v1/workers/${state.workerProfileId}`, { token: state.clientToken });
  check('GET /v1/workers/:id 200', wOne.status === 200, `got ${wOne.status}`);

  section('Role guards');
  const workerTriesJob = await api('/v1/jobs', {
    method: 'POST',
    token: state.workerToken,
    body: { categoryId: state.categoryId, title: 'x', location: 'x', offeredRate: '1', rateUnit: 'day', startsAt: new Date().toISOString() },
  });
  check('worker cannot POST /v1/jobs (403)', workerTriesJob.status === 403, `got ${workerTriesJob.status}`);
  const clientTriesWorkerMe = await api('/v1/workers/me', { token: state.clientToken });
  check('client cannot GET /v1/workers/me (403)', clientTriesWorkerMe.status === 403, `got ${clientTriesWorkerMe.status}`);

  section('Job lifecycle');
  const startsAt = new Date(Date.now() + 86400000).toISOString();
  const job = await api('/v1/jobs', {
    method: 'POST',
    token: state.clientToken,
    body: {
      categoryId: state.categoryId,
      title: 'E2E Test Job',
      description: 'Created by the automated end-to-end test.',
      location: 'Chennai',
      workersRequired: 2,
      offeredRate: '1200',
      rateUnit: 'day',
      startsAt,
    },
  });
  check('POST /v1/jobs 201', job.status === 201, `got ${job.status} ${JSON.stringify(job.data)}`);
  state.jobId = job.data?.id;
  check('job has open status', job.data?.status === 'open', `got ${job.data?.status}`);

  const mine = await api('/v1/jobs/mine', { token: state.clientToken });
  check('GET /v1/jobs/mine 200', mine.status === 200, `got ${mine.status}`);
  check('own job appears in /mine', (mine.data || []).some((j) => j.id === state.jobId));

  // Candidates no longer browse or apply: a job is a requirement only its client sees.
  const jobDetail = await api(`/v1/jobs/${state.jobId}`, { token: state.clientToken });
  check('client GET own /v1/jobs/:id 200', jobDetail.status === 200, `got ${jobDetail.status}`);
  check('job detail title matches', jobDetail.data?.title === 'E2E Test Job', `got ${jobDetail.data?.title}`);

  section('Job browsing and applying are gone');
  const browse = await api('/v1/jobs', { token: state.workerToken });
  check('GET /v1/jobs (browse) no longer exists (404)', browse.status === 404, `got ${browse.status}`);
  const workerSeesJob = await api(`/v1/jobs/${state.jobId}`, { token: state.workerToken });
  check('worker cannot GET /v1/jobs/:id (403)', workerSeesJob.status === 403, `got ${workerSeesJob.status}`);
  const anonSeesJob = await api(`/v1/jobs/${state.jobId}`);
  check('anonymous GET /v1/jobs/:id rejected (401)', anonSeesJob.status === 401, `got ${anonSeesJob.status}`);
  const apply = await api(`/v1/jobs/${state.jobId}/applications`, {
    method: 'POST',
    token: state.workerToken,
    body: { proposedRate: '1100' },
  });
  check('applying no longer exists (404)', apply.status === 404, `got ${apply.status}`);
  const myApps = await api('/v1/applications/mine', { token: state.workerToken });
  check('GET /v1/applications/mine no longer exists (404)', myApps.status === 404, `got ${myApps.status}`);
  const reviews = await api(`/v1/reviews?userId=${state.workerId}`, { token: state.clientToken });
  check('reviews API no longer exists (404)', reviews.status === 404, `got ${reviews.status}`);

  section('Job status transitions');
  for (const s of ['in_progress', 'completed']) {
    const r = await api(`/v1/jobs/${state.jobId}/status`, { method: 'PATCH', token: state.clientToken, body: { status: s } });
    check(`PATCH job status → ${s}`, r.status === 200, `got ${r.status} ${JSON.stringify(r.data)}`);
  }
  const finalJob = await api(`/v1/jobs/${state.jobId}`, { token: state.clientToken });
  check('job is completed', finalJob.data?.status === 'completed', `got ${finalJob.data?.status}`);

  section('Validation');
  const badJob = await api('/v1/jobs', { method: 'POST', token: state.clientToken, body: { title: '' } });
  check('invalid job payload rejected 400', badJob.status === 400, `got ${badJob.status}`);

  section('Token refresh');
  // Both clients depend on this: the access token is short-lived, and a 401
  // triggers a refresh-and-retry. If refresh breaks, every logged-in user is
  // locked out ~15 minutes after signing in.
  const staleToken = state.clientToken.slice(0, -3) + 'xxx';
  const rejected = await api('/v1/clients/me', { token: staleToken });
  check('tampered access token → 401', rejected.status === 401, `got ${rejected.status}`);

  const renewed = await api('/v1/auth/refresh', {
    method: 'POST',
    body: { refreshToken: state.clientRefresh },
  });
  check('refresh returns a new access token', !!renewed.data?.accessToken, `got ${renewed.status}`);
  check('refresh rotates the refresh token', !!renewed.data?.refreshToken);

  const afterRefresh = await api('/v1/clients/me', { token: renewed.data?.accessToken });
  check('refreshed token authorises requests', afterRefresh.status === 200, `got ${afterRefresh.status}`);

  const badRefresh = await api('/v1/auth/refresh', {
    method: 'POST',
    body: { refreshToken: 'not-a-real-token' },
  });
  check('garbage refresh token rejected', badRefresh.status >= 400, `got ${badRefresh.status}`);

  section('Refresh token revocation');
  // Refresh tokens live for 7 days, so they have to be killable server-side.
  // Each issued token carries a jti: without it two tokens minted in the same
  // second are byte-identical and collide on the stored hash.
  const consumed = state.clientRefresh;
  const replayed = await api('/v1/auth/refresh', { method: 'POST', body: { refreshToken: consumed } });
  check('a rotated (already used) refresh token is rejected', replayed.status === 401, `got ${replayed.status}`);

  const live = renewed.data.refreshToken;
  const loggedOut = await api('/v1/auth/logout', { method: 'POST', body: { refreshToken: live } });
  check('logout returns 200', loggedOut.status === 200, `got ${loggedOut.status}`);

  const afterLogout = await api('/v1/auth/refresh', { method: 'POST', body: { refreshToken: live } });
  check('refresh after logout is rejected', afterLogout.status === 401, `got ${afterLogout.status}`);

  const logoutAgain = await api('/v1/auth/logout', { method: 'POST', body: { refreshToken: live } });
  check('logout is idempotent', logoutAgain.status === 200, `got ${logoutAgain.status}`);

  // Re-establish a session for the remaining sections.
  const reLogin = await api('/v1/auth/login', { method: 'POST', body: { phone: clientPhone, password: PASSWORD } });
  check('can log in again after logout', !!reLogin.data?.accessToken, `got ${reLogin.status}`);
  state.clientToken = reLogin.data?.accessToken ?? state.clientToken;
  state.clientRefresh = reLogin.data?.refreshToken ?? state.clientRefresh;

  section('Malformed path params');
  // These must be rejected as bad input, never surface as a 500 from the DB
  // driver failing to parse the id.
  const badIdCases = [
    ['GET /v1/jobs/:id', await api('/v1/jobs/not-a-uuid', { token: state.clientToken })],
    ['GET /v1/workers/:id', await api('/v1/workers/not-a-uuid', { token: state.clientToken })],
  ];
  for (const [label, res] of badIdCases) {
    check(`${label} with bad uuid → 400 (not 500)`, res.status === 400, `got ${res.status}`);
  }
  const missing = await api('/v1/jobs/00000000-0000-4000-8000-000000000000', { token: state.clientToken });
  check('valid uuid for missing row → 404', missing.status === 404, `got ${missing.status}`);

  section('Rate limiting');
  let sawLimit = false;
  let attempts = 0;
  for (let i = 0; i < 15; i++) {
    attempts++;
    const r = await api('/v1/auth/login', { method: 'POST', body: { phone: `+9199999${i}0000`, password: 'nope' } });
    if (r.status === 429) {
      sawLimit = true;
      break;
    }
  }
  check('login rate limit triggers 429', sawLimit, `no 429 after ${attempts} attempts`);

  // Report
  console.log(`\n${'='.repeat(56)}`);
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  console.log('='.repeat(56));
  console.log(`\nAccounts created by this run: client=${clientPhone} worker=${workerPhone}`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
