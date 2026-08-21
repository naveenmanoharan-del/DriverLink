/**
 * End-to-end API test suite.
 *
 * Exercises every controller route against a *running* server: registration and
 * login, role guards, the full job -> application -> review lifecycle, the
 * denormalised worker aggregates, token refresh, input validation and rate
 * limiting.
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
    'all 4 labour groups present',
    ['physical_labour', 'driver', 'artisan', 'office_staff'].every((g) => groups.includes(g)),
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

  const openJobs = await api('/v1/jobs', { token: state.workerToken });
  check('GET /v1/jobs (worker browse) 200', openJobs.status === 200, `got ${openJobs.status}`);
  check('GET /v1/jobs is paginated {data,page,pageSize}', Array.isArray(openJobs.data?.data) && openJobs.data?.page != null, JSON.stringify(openJobs.data).slice(0, 120));
  check('new job visible to worker', (openJobs.data?.data || []).some((j) => j.id === state.jobId));

  const jobDetail = await api(`/v1/jobs/${state.jobId}`, { token: state.workerToken });
  check('GET /v1/jobs/:id 200', jobDetail.status === 200, `got ${jobDetail.status}`);
  check('job detail title matches', jobDetail.data?.title === 'E2E Test Job', `got ${jobDetail.data?.title}`);

  section('Applications');
  const applyRes = await api(`/v1/jobs/${state.jobId}/applications`, {
    method: 'POST',
    token: state.workerToken,
    body: { proposedRate: '1100', message: 'Available and verified.' },
  });
  check('POST application 201', applyRes.status === 201, `got ${applyRes.status} ${JSON.stringify(applyRes.data)}`);
  state.appId = applyRes.data?.id;
  check('application starts pending', applyRes.data?.status === 'pending', `got ${applyRes.data?.status}`);

  const dupeApply = await api(`/v1/jobs/${state.jobId}/applications`, {
    method: 'POST',
    token: state.workerToken,
    body: { proposedRate: '1000' },
  });
  check('duplicate application rejected', dupeApply.status >= 400, `got ${dupeApply.status}`);

  const myApps = await api('/v1/applications/mine', { token: state.workerToken });
  check('GET /v1/applications/mine 200', myApps.status === 200, `got ${myApps.status}`);
  check('own application listed', (myApps.data || []).some((a) => a.id === state.appId));

  const jobApps = await api(`/v1/jobs/${state.jobId}/applications`, { token: state.clientToken });
  check('client sees applications on job', jobApps.status === 200 && (jobApps.data || []).some((a) => a.id === state.appId), `got ${jobApps.status}`);

  const accept = await api(`/v1/applications/${state.appId}`, {
    method: 'PATCH',
    token: state.clientToken,
    body: { status: 'accepted' },
  });
  check('PATCH application → accepted 200', accept.status === 200, `got ${accept.status} ${JSON.stringify(accept.data)}`);

  const myApps2 = await api('/v1/applications/mine', { token: state.workerToken });
  const acceptedApp = (myApps2.data || []).find((a) => a.id === state.appId);
  check('worker sees accepted status', acceptedApp?.status === 'accepted', `got ${acceptedApp?.status}`);

  section('Job status transitions');
  for (const s of ['in_progress', 'completed']) {
    const r = await api(`/v1/jobs/${state.jobId}/status`, { method: 'PATCH', token: state.clientToken, body: { status: s } });
    check(`PATCH job status → ${s}`, r.status === 200, `got ${r.status} ${JSON.stringify(r.data)}`);
  }
  const finalJob = await api(`/v1/jobs/${state.jobId}`, { token: state.clientToken });
  check('job is completed', finalJob.data?.status === 'completed', `got ${finalJob.data?.status}`);

  section('Reviews');
  const review = await api(`/v1/jobs/${state.jobId}/reviews`, {
    method: 'POST',
    token: state.clientToken,
    body: { toUserId: state.workerId, rating: 5, comment: 'Excellent work, punctual and verified.' },
  });
  check('POST review 201', review.status === 201, `got ${review.status} ${JSON.stringify(review.data)}`);

  const reviews = await api(`/v1/reviews?userId=${state.workerId}`, { token: state.clientToken });
  check('GET /v1/reviews 200', reviews.status === 200, `got ${reviews.status}`);
  check('review listed for worker', Array.isArray(reviews.data) && reviews.data.length > 0, `got ${JSON.stringify(reviews.data)}`);

  const wAfter = await api('/v1/workers/me', { token: state.workerToken });
  check('worker rating updated after review', Number(wAfter.data?.rating) === 5, `rating=${wAfter.data?.rating}`);
  check('worker completedJobs incremented', Number(wAfter.data?.completedJobs) === 1, `completedJobs=${wAfter.data?.completedJobs}`);

  // A second review should average, not overwrite.
  const review2 = await api(`/v1/jobs/${state.jobId}/reviews`, {
    method: 'POST',
    token: state.clientToken,
    body: { toUserId: state.workerId, rating: 3, comment: 'Second review.' },
  });
  check('second review accepted', review2.status === 201, `got ${review2.status}`);
  const wAvg = await api('/v1/workers/me', { token: state.workerToken });
  check('rating averages across reviews (5,3 → 4)', Number(wAvg.data?.rating) === 4, `rating=${wAvg.data?.rating}`);

  // Both dashboards render the profile embedded in /v1/auth/me rather than
  // calling /v1/workers/me, and they cache it. If this payload doesn't carry
  // the fresh aggregate, the UI shows a stale rating no matter how many jobs
  // the worker finishes.
  const meAfter = await api('/v1/auth/me', { token: state.workerToken });
  check(
    '/v1/auth/me profile carries the updated rating',
    Number(meAfter.data?.profile?.rating) === 4,
    `rating=${meAfter.data?.profile?.rating}`,
  );
  check(
    '/v1/auth/me profile carries completedJobs',
    Number(meAfter.data?.profile?.completedJobs) === 1,
    `completedJobs=${meAfter.data?.profile?.completedJobs}`,
  );

  // Re-sending completed must not double-count.
  await api(`/v1/jobs/${state.jobId}/status`, { method: 'PATCH', token: state.clientToken, body: { status: 'completed' } });
  const wIdem = await api('/v1/workers/me', { token: state.workerToken });
  check('re-completing job does not double-count', Number(wIdem.data?.completedJobs) === 1, `completedJobs=${wIdem.data?.completedJobs}`);

  section('Withdraw flow (second job)');
  const job2 = await api('/v1/jobs', {
    method: 'POST',
    token: state.clientToken,
    body: { categoryId: state.categoryId2, title: 'E2E Withdraw Job', location: 'Chennai', workersRequired: 1, offeredRate: '600', rateUnit: 'day', startsAt },
  });
  check('second job created', job2.status === 201, `got ${job2.status}`);
  const app2 = await api(`/v1/jobs/${job2.data?.id}/applications`, {
    method: 'POST',
    token: state.workerToken,
    body: { proposedRate: '650' },
  });
  check('applied to second job', app2.status === 201, `got ${app2.status}`);
  const withdraw = await api(`/v1/applications/${app2.data?.id}/withdraw`, { method: 'PATCH', token: state.workerToken });
  check('PATCH withdraw 200', withdraw.status === 200, `got ${withdraw.status} ${JSON.stringify(withdraw.data)}`);
  const myApps3 = await api('/v1/applications/mine', { token: state.workerToken });
  const wd = (myApps3.data || []).find((a) => a.id === app2.data?.id);
  check('application shows withdrawn', wd?.status === 'withdrawn', `got ${wd?.status}`);

  section('Validation');
  const badJob = await api('/v1/jobs', { method: 'POST', token: state.clientToken, body: { title: '' } });
  check('invalid job payload rejected 400', badJob.status === 400, `got ${badJob.status}`);
  const badRating = await api(`/v1/jobs/${state.jobId}/reviews`, {
    method: 'POST',
    token: state.clientToken,
    body: { toUserId: state.workerId, rating: 99 },
  });
  check('out-of-range rating rejected', badRating.status >= 400, `got ${badRating.status}`);

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
    ['PATCH /v1/applications/:id', await api('/v1/applications/undefined', { method: 'PATCH', token: state.clientToken, body: { status: 'accepted' } })],
    ['GET /v1/jobs/:jobId/applications', await api('/v1/jobs/abc/applications', { token: state.clientToken })],
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
