/**
 * End-to-end tests for candidate registration, resumes, privacy and the admin
 * panel API. Like api-e2e.mjs it drives a *running* server over HTTP.
 *
 * Usage:
 *   ADMIN_PHONE=+91... ADMIN_PASSWORD=... npm run test:admin
 *
 * The admin credentials must belong to an existing admin account (see
 * ADMIN_PHONE in DEPLOY.md). It creates, edits and deletes real records, so run
 * it against a local or disposable database only.
 *
 * Registration is rate-limited per IP. Locally the API trusts one proxy hop,
 * so each registration here claims its own X-Forwarded-For address. Behind a
 * real proxy (Render) that header is overwritten, which is why this suite is
 * for local databases.
 */
const API = process.env.API_URL ?? 'http://localhost:3000/api';
const ADMIN_PHONE = process.env.ADMIN_PHONE;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PHONE || !ADMIN_PASSWORD) {
  console.error('Set ADMIN_PHONE and ADMIN_PASSWORD to an existing admin account.');
  process.exit(2);
}

let pass = 0;
let fail = 0;
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
const section = (t) => console.log(`\n=== ${t} ===`);

let ipCounter = 1;
const freshIp = () => `10.${(ipCounter >> 8) & 255}.${ipCounter++ & 255}.${Math.floor(Math.random() * 250) + 1}`;

async function parse(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function api(path, { method = 'GET', token, body, form, ip } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Forwarded-For': ip ?? freshIp(),
    },
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  return { status: res.status, data: await parse(res), headers: res.headers };
}

async function raw(path, token) {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}`, 'X-Forwarded-For': freshIp() } });
  return { status: res.status, headers: res.headers, buf: Buffer.from(await res.arrayBuffer()) };
}

const stamp = Date.now().toString().slice(-7);
let phoneSeq = 0;
const newPhone = () => `+9160${stamp}${String(phoneSeq++).padStart(3, '0')}`;
const PDF = (text = 'resume') => Buffer.from(`%PDF-1.4\n% ${text}\n`);

/** Multipart registration; `fields` may override any default. */
function registrationForm(fields = {}, file = { name: 'cv.pdf', data: PDF() }) {
  const form = new FormData();
  const base = {
    phone: newPhone(),
    password: 'secret123',
    firstName: 'Test',
    categoryId: state.categoryId,
    minRate: '50000',
    rateUnit: 'month',
    ...fields,
  };
  for (const [k, v] of Object.entries(base)) if (v !== undefined) form.append(k, String(v));
  if (file) form.append(file.field ?? 'resume', new Blob([file.data]), file.name);
  return { form, phone: base.phone };
}

async function register(fields, file) {
  const { form, phone } = registrationForm(fields, file);
  const r = await api('/v1/auth/register/worker', { method: 'POST', form });
  return { ...r, phone };
}

const state = {};
const created = [];

async function run() {
  section('Setup');
  const health = await api('/health');
  check('health reports the database', health.status === 200 && health.data?.database === 'ok', JSON.stringify(health.data));
  const cats = await api('/v1/categories');
  check('only the 3 consultancy groups are listed', new Set(cats.data.map((c) => c.group)).size === 3);
  const track = cats.data.find((c) => c.name.startsWith('Track'));
  const office = cats.data.find((c) => c.group === 'support_staff');
  state.categoryId = track.id;
  state.officeCategoryId = office.id;
  const adminLogin = await api('/v1/auth/login', { method: 'POST', body: { phone: ADMIN_PHONE, password: ADMIN_PASSWORD } });
  check('admin can log in', adminLogin.status === 200 && adminLogin.data.user.role === 'admin', `got ${adminLogin.status}`);
  const A = adminLogin.data.accessToken;
  state.admin = A;
  state.adminUserId = adminLogin.data.user.id;

  // ------------------------------------------------------------------
  section('Registration: input restrictions');
  const bad = async (name, fields, file, expect = 400) => {
    const r = await register(fields, file);
    check(name, r.status === expect, `got ${r.status} ${JSON.stringify(r.data).slice(0, 160)}`);
    return r;
  };
  await bad('missing firstName → 400', { firstName: undefined });
  await bad('missing phone → 400', { phone: undefined });
  await bad('phone with letters → 400', { phone: '+91abc1234567' });
  await bad('phone too short (6 digits) → 400', { phone: '123456' });
  await bad('phone too long (16 digits) → 400', { phone: '1234567890123456' });
  await bad('password of 7 chars → 400', { password: 'abc1234' });
  await bad('password of 73 chars → 400', { password: 'a'.repeat(73) });
  await bad('invalid email → 400', { email: 'not-an-email' });
  await bad('firstName of 101 chars → 400', { firstName: 'x'.repeat(101) });
  await bad('qualification of 256 chars → 400', { qualification: 'q'.repeat(256) });
  await bad('negative experience → 400', { yearsExperience: -1 });
  await bad('experience of 71 years → 400', { yearsExperience: 71 });
  await bad('non-numeric experience → 400', { yearsExperience: 'ten' });
  await bad('negative salary → 400', { minRate: '-5' });
  await bad('salary in exponent form → 400', { minRate: '1e9' });
  await bad('salary with 3 decimals → 400', { minRate: '100.123' });
  await bad('non-numeric salary → 400', { minRate: 'lots' });
  await bad('unknown rate unit → 400', { rateUnit: 'week' });
  await bad('retirement year 1969 → 400', { retirementYear: 1969 });
  await bad('retirement year 2101 → 400', { retirementYear: 2101 });
  await bad('unknown background → 400', { background: 'astronaut' });
  await bad('unknown sector → 400', { sectors: 'railways,airports' });
  await bad('duplicate sector → 400', { sectors: 'railways,railways' });
  await bad('categoryId not a uuid → 400', { categoryId: 'abc' });
  await bad('unknown categoryId → 400 (not 500)', { categoryId: '00000000-0000-4000-8000-000000000000' });
  const legacy = await fetch(`${API}/v1/categories`).then(() => null);
  void legacy;
  await bad('unexpected extra field → 400', { isAdmin: 'true' });
  await bad('role injection field → 400', { role: 'admin' });

  section('Registration: resume restrictions');
  await bad('text file renamed .pdf → 400', {}, { name: 'cv.pdf', data: Buffer.from('hello world') });
  await bad('Windows .exe renamed .pdf → 400', {}, { name: 'cv.pdf', data: Buffer.from('MZ\x90\x00\x03') });
  await bad('PNG image → 400', {}, { name: 'cv.png', data: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]) });
  await bad('empty file → 400', {}, { name: 'cv.pdf', data: Buffer.alloc(0) });
  await bad('file over 5 MB → 413', {}, { name: 'big.pdf', data: Buffer.concat([PDF(), Buffer.alloc(5 * 1024 * 1024)]) }, 413);
  await bad('file under the wrong field name → 400', {}, { name: 'cv.pdf', data: PDF(), field: 'cv' });
  {
    const { form } = registrationForm();
    form.append('resume', new Blob([PDF()]), 'second.pdf');
    const r = await api('/v1/auth/register/worker', { method: 'POST', form });
    check('two resume files → 400', r.status === 400, `got ${r.status}`);
  }
  const rejected = await register({ phone: newPhone() }, { name: 'cv.pdf', data: Buffer.from('nope') });
  const loginRejected = await api('/v1/auth/login', { method: 'POST', body: { phone: rejected.phone, password: 'secret123' } });
  check('a rejected upload leaves no half-created account', loginRejected.status === 401, `got ${loginRejected.status}`);

  section('Registration: storage round trip');
  // Every byte value, so any text/encoding corruption on the way shows up.
  const binary = Buffer.concat([PDF('binary'), Buffer.from(Array.from({ length: 256 }, (_, i) => i)), Buffer.from('ﬀ€\u0000end')]);
  const full = {
    firstName: 'சுரேஷ்',
    lastName: "O'Brien-Iyer",
    email: `Mixed.Case${stamp}@Example.com`,
    yearsExperience: 34,
    minRate: '125000.50',
    rateUnit: 'month',
    city: 'Tiruchirappalli',
    background: 'retired_railway',
    sectors: 'railways,highways',
    qualification: 'M.Tech (Structures), IIT Madras',
    lastDesignation: 'Chief Bridge Engineer; SAG',
    lastOrganisation: "Robert'); DROP TABLE users;--",
    retirementYear: 2022,
  };
  const reg = await register(full, { name: 'Suresh CV (final).pdf', data: binary });
  check('full registration → 201', reg.status === 201, `got ${reg.status} ${JSON.stringify(reg.data).slice(0, 200)}`);
  const w = { phone: reg.phone, token: reg.data.accessToken, profileId: reg.data.profile.id, userId: reg.data.user.id };
  created.push(w.userId);
  check('response never includes the password hash', !JSON.stringify(reg.data).includes('passwordHash'));
  check('response hides admin-only fields', !('adminNotes' in reg.data.profile) && !('pipelineStatus' in reg.data.profile));
  check('email stored lower-cased', reg.data.user.email === full.email.toLowerCase(), reg.data.user.email);

  const detail = await api(`/v1/admin/candidates/${w.profileId}`, { token: A });
  const d = detail.data;
  check('admin detail 200', detail.status === 200, `got ${detail.status}`);
  const expectEq = (field, actual, expected) =>
    check(`round trip: ${field}`, JSON.stringify(actual) === JSON.stringify(expected), `${JSON.stringify(actual)} ≠ ${JSON.stringify(expected)}`);
  expectEq('Tamil first name', d.firstName, full.firstName);
  expectEq('apostrophe surname', d.lastName, full.lastName);
  expectEq('SQL-looking text stored literally', d.lastOrganisation, full.lastOrganisation);
  expectEq('qualification', d.qualification, full.qualification);
  expectEq('designation', d.lastDesignation, full.lastDesignation);
  expectEq('experience', d.yearsExperience, 34);
  expectEq('salary', d.minRate, '125000.50');
  expectEq('rate unit', d.rateUnit, 'month');
  expectEq('city', d.city, full.city);
  expectEq('background', d.background, 'retired_railway');
  expectEq('sectors', d.sectors, ['railways', 'highways']);
  expectEq('retirement year', d.retirementYear, 2022);
  expectEq('phone', d.phone, reg.phone);
  expectEq('position', d.category, track.name);
  expectEq('new candidates start in the "new" stage', d.pipelineStatus, 'new');
  expectEq('resume file name', d.resume?.fileName, 'Suresh CV (final).pdf');
  expectEq('resume size', d.resume?.sizeBytes, binary.length);
  const adminFile = await raw(`/v1/admin/candidates/${w.profileId}/resume`, A);
  check('admin resume download is byte-identical', adminFile.status === 200 && adminFile.buf.equals(binary), `status ${adminFile.status}, ${adminFile.buf.length} bytes`);
  check('download is an attachment', /^attachment/.test(adminFile.headers.get('content-disposition') ?? ''));
  check('download is not cached', /no-store/.test(adminFile.headers.get('cache-control') ?? ''));
  const inline = await raw(`/v1/admin/candidates/${w.profileId}/resume?inline=true`, A);
  check('?inline=true serves it for preview', /^inline/.test(inline.headers.get('content-disposition') ?? ''));
  const ownFile = await raw('/v1/workers/me/resume/file', w.token);
  check('candidate own download is byte-identical', ownFile.buf.equals(binary));

  section('Registration: duplicates and optional fields');
  const dupPhone = await register({ phone: reg.phone });
  check('duplicate phone → 409', dupPhone.status === 409, `got ${dupPhone.status}`);
  const dupEmail = await register({ email: full.email.toUpperCase() });
  check('duplicate email, different case → 409', dupEmail.status === 409, `got ${dupEmail.status}`);
  const noResume = await register({ firstName: 'NoResume', lastName: 'Person' }, null);
  check('resume is optional at the API (app compatibility)', noResume.status === 201, `got ${noResume.status}`);
  created.push(noResume.data.user.id);
  const jsonReg = await api('/v1/auth/register/worker', {
    method: 'POST',
    body: { phone: newPhone(), password: 'secret123', firstName: 'Json', categoryId: state.officeCategoryId, minRate: '20000', sectors: ['highways'] },
  });
  check('JSON registration with a sectors array (mobile app)', jsonReg.status === 201 && jsonReg.data.profile.sectors[0] === 'highways', `got ${jsonReg.status}`);
  created.push(jsonReg.data.user.id);
  state.json = { profileId: jsonReg.data.profile.id, userId: jsonReg.data.user.id, token: jsonReg.data.accessToken };

  // ------------------------------------------------------------------
  section('Access control');
  const client = await api('/v1/auth/register/client', {
    method: 'POST',
    body: { phone: newPhone(), password: 'secret123', name: 'Test HR', companyName: `Acme Consult ${stamp}`, clientType: 'company', email: `hr${stamp}@acme.example` },
  });
  check('client registration → 201', client.status === 201, `got ${client.status}`);
  created.push(client.data.user.id);
  state.client = { token: client.data.accessToken, profileId: client.data.profile.id, userId: client.data.user.id };

  const adminRoutes = [
    ['GET', '/v1/admin/stats'],
    ['GET', '/v1/admin/candidates'],
    ['GET', '/v1/admin/candidates/export'],
    ['GET', `/v1/admin/candidates/${w.profileId}`],
    ['GET', `/v1/admin/candidates/${w.profileId}/resume`],
    ['PATCH', `/v1/admin/candidates/${w.profileId}`],
    ['GET', '/v1/admin/clients'],
    ['PATCH', `/v1/admin/users/${w.userId}/active`],
    ['DELETE', `/v1/admin/users/${w.userId}`],
    ['GET', '/v1/admin/placements'],
    ['POST', '/v1/admin/placements'],
    ['GET', '/v1/admin/admins'],
    ['POST', '/v1/admin/admins'],
    ['GET', '/v1/admin/audit'],
  ];
  let anonOk = true, workerOk = true, clientOk = true;
  for (const [method, path] of adminRoutes) {
    const body = method === 'GET' || method === 'DELETE' ? undefined : {};
    if ((await api(path, { method, body })).status !== 401) anonOk = false;
    if ((await api(path, { method, body, token: w.token })).status !== 403) workerOk = false;
    if ((await api(path, { method, body, token: state.client.token })).status !== 403) clientOk = false;
  }
  check(`all ${adminRoutes.length} admin routes: anonymous → 401`, anonOk);
  check(`all ${adminRoutes.length} admin routes: candidate → 403`, workerOk);
  check(`all ${adminRoutes.length} admin routes: client → 403`, clientOk);
  check('the candidate still exists after the blocked DELETE', (await api(`/v1/admin/candidates/${w.profileId}`, { token: A })).status === 200);
  check('forged admin token → 401', (await api('/v1/admin/stats', { token: A.slice(0, -4) + 'abcd' })).status === 401);

  const anonBrowse = await api('/v1/workers');
  check('public candidate browsing now needs login → 401', anonBrowse.status === 401, `got ${anonBrowse.status}`);
  const workerBrowse = await api('/v1/workers', { token: w.token });
  check('candidates cannot browse other candidates → 403', workerBrowse.status === 403, `got ${workerBrowse.status}`);
  const clientBrowse = await api('/v1/workers?pageSize=100', { token: state.client.token });
  check('clients can browse candidates', clientBrowse.status === 200);

  // ------------------------------------------------------------------
  section('Admin: candidate list, search and filters');
  const list = (q) => api(`/v1/admin/candidates${q}`, { token: A });
  const byName = await list(`?q=${encodeURIComponent('சுரேஷ்')}`);
  check('search by Tamil name finds them', byName.data.data.some((c) => c.id === w.profileId), `total ${byName.data.total}`);
  const byPhone = await list(`?q=${encodeURIComponent(reg.phone.slice(-8))}`);
  check('search by phone fragment', byPhone.data.data.some((c) => c.id === w.profileId));
  const byEmail = await list(`?q=${encodeURIComponent(`MIXED.CASE${stamp}`)}`);
  check('search by email is case-insensitive', byEmail.data.data.some((c) => c.id === w.profileId));
  const byOrg = await list(`?q=${encodeURIComponent('DROP TABLE')}`);
  check('search text containing SQL is harmless', byOrg.status === 200 && byOrg.data.data.some((c) => c.id === w.profileId));
  const pct = await list(`?q=${encodeURIComponent('%')}`);
  check('"%" is searched literally, not as a wildcard', pct.status === 200 && !pct.data.data.some((c) => c.id === w.profileId), `total ${pct.data.total}`);
  const under = await list(`?q=_`);
  check('"_" is searched literally', under.status === 200 && !under.data.data.some((c) => c.id === w.profileId));
  const combo = await list(`?group=key_personnel&background=retired_railway&sector=highways&hasResume=true&minExperience=30&maxExperience=40&city=tiruchi`);
  check('combined filters match', combo.data.data.some((c) => c.id === w.profileId), `total ${combo.data.total}`);
  const miss = await list(`?group=key_personnel&background=private_sector&q=${encodeURIComponent('சுரேஷ்')}`);
  check('a non-matching filter excludes them', miss.data.total === 0 || !miss.data.data.some((c) => c.id === w.profileId));
  const noRes = await list(`?hasResume=false&q=NoResume`);
  check('hasResume=false finds the candidate without one', noRes.data.data.some((c) => c.name === 'NoResume Person'));
  const today = new Date().toISOString().slice(0, 10);
  const dated = await list(`?registeredFrom=${today}&registeredTo=${today}&q=${encodeURIComponent('சுரேஷ்')}`);
  check('registered today is inside a today–today range (inclusive)', dated.data.data.some((c) => c.id === w.profileId));
  const future = await list(`?registeredFrom=2099-01-01`);
  check('a future date range returns nothing', future.data.total === 0);
  const blank = await list(`?city=&q=&group=`);
  check('blank filter params are ignored, not matched', blank.status === 200 && blank.data.total > 0, `got ${blank.status}`);

  const page1 = await list('?pageSize=5&page=1&sort=oldest');
  const page2 = await list('?pageSize=5&page=2&sort=oldest');
  const ids = new Set([...page1.data.data, ...page2.data.data].map((c) => c.id));
  check('pagination: pages do not overlap', ids.size === page1.data.data.length + page2.data.data.length);
  check('pagination: total is consistent across pages', page1.data.total === page2.data.total);
  const exp = await list('?sort=experience_desc&pageSize=50');
  const years = exp.data.data.map((c) => c.yearsExperience);
  check('sort by experience is descending', years.every((y, i) => i === 0 || years[i - 1] >= y));
  const names = (await list('?sort=name&pageSize=50')).data.data.map((c) => c.name.toLowerCase());
  check('sort by name is alphabetical', names.every((n, i) => i === 0 || names[i - 1].localeCompare(n, 'en', { sensitivity: 'base' }) <= 0 || names[i - 1] <= n));

  for (const [q, name] of [
    ['?pageSize=101', 'pageSize over 100'],
    ['?page=0', 'page 0'],
    ['?group=artisan', 'a retired group'],
    ['?pipelineStatus=hired', 'unknown pipeline status'],
    ['?hasResume=maybe', 'non-boolean hasResume'],
    ['?minExperience=-1', 'negative experience'],
    ['?registeredFrom=yesterday', 'a non-date'],
    ['?sort=random', 'unknown sort'],
    ['?categoryId=1', 'non-uuid category'],
    [`?q=${'a'.repeat(101)}`, 'search over 100 chars'],
    ['?foo=bar', 'unknown parameter'],
  ]) {
    const r = await list(q);
    check(`candidate list rejects ${name} → 400`, r.status === 400, `got ${r.status}`);
  }
  check('bad uuid in path → 400', (await api('/v1/admin/candidates/not-a-uuid', { token: A })).status === 400);
  check('unknown candidate → 404', (await api('/v1/admin/candidates/00000000-0000-4000-8000-000000000000', { token: A })).status === 404);
  check('resume of a candidate without one → 404', (await api(`/v1/admin/candidates/${noResume.data.profile.id}/resume`, { token: A })).status === 404);

  // ------------------------------------------------------------------
  section('Admin: editing a candidate');
  const note = 'Strong on P-Way. Available from Nov. <script>alert(1)</script> "quoted", comma';
  const upd = await api(`/v1/admin/candidates/${w.profileId}`, {
    method: 'PATCH',
    token: A,
    body: { pipelineStatus: 'shortlisted', verificationStatus: 'verified', adminNotes: note },
  });
  check('update pipeline/verification/notes → 200', upd.status === 200, `got ${upd.status}`);
  const again = (await api(`/v1/admin/candidates/${w.profileId}`, { token: A })).data;
  check('pipeline saved', again.pipelineStatus === 'shortlisted');
  check('verification saved', again.verificationStatus === 'verified');
  check('notes saved exactly (HTML kept as text)', again.adminNotes === note);
  const meW = await api('/v1/workers/me', { token: w.token });
  const meAuth = await api('/v1/auth/me', { token: w.token });
  const meLogin = await api('/v1/auth/login', { method: 'POST', body: { phone: reg.phone, password: 'secret123' } });
  const leaked = [meW.data, meAuth.data, meLogin.data, (await api(`/v1/workers/${w.profileId}`, { token: state.client.token })).data]
    .map((x) => JSON.stringify(x))
    .some((s) => s.includes('P-Way. Available') || s.includes('adminNotes') || s.includes('pipelineStatus'));
  check('admin notes and pipeline never reach the candidate or clients', !leaked);
  w.token = meLogin.data.accessToken;
  w.refresh = meLogin.data.refreshToken;
  const verifiedShown = meW.data.verificationStatus === 'verified';
  check('the candidate does see their verification status', verifiedShown);
  for (const [body, name] of [
    [{}, 'an empty update'],
    [{ pipelineStatus: 'hired' }, 'an unknown pipeline status'],
    [{ adminNotes: 'x'.repeat(5001) }, 'notes over 5000 chars'],
    [{ firstName: 'Hacked' }, 'fields admins may not edit here'],
  ]) {
    const r = await api(`/v1/admin/candidates/${w.profileId}`, { method: 'PATCH', token: A, body });
    check(`update rejects ${name} → 400`, r.status === 400, `got ${r.status}`);
  }
  check('update of unknown candidate → 404', (await api('/v1/admin/candidates/00000000-0000-4000-8000-000000000000', { method: 'PATCH', token: A, body: { pipelineStatus: 'new' } })).status === 404);

  // ------------------------------------------------------------------
  section('Admin: placements');
  const P = (body) => api('/v1/admin/placements', { method: 'POST', token: A, body });
  const company = `Egis Test ${stamp}`;
  const plc = await P({ workerId: w.profileId, companyName: `  ${company}  `, position: 'Track Expert', projectName: 'NH-44 widening', contractType: 'ae', sector: 'highways', location: 'Salem', startDate: '2026-08-01', monthlyRemuneration: '145000', notes: 'via referral' });
  check('record a placement → 201', plc.status === 201, `got ${plc.status} ${JSON.stringify(plc.data).slice(0, 200)}`);
  check('company name trimmed', plc.data.companyName === company);
  check('candidate name copied from the profile', plc.data.candidateName === `${full.firstName} ${full.lastName}`);
  check('placing moves the candidate to "placed"', (await api(`/v1/admin/candidates/${w.profileId}`, { token: A })).data.pipelineStatus === 'placed');
  const offPlatform = await P({ candidateName: 'Walk-in Candidate', companyName: company, position: 'Accountant', startDate: '2026-09-01' });
  check('placement of someone not registered → 201', offPlatform.status === 201, `got ${offPlatform.status}`);
  for (const [body, name, code = 400] of [
    [{ companyName: company, position: 'X', startDate: '2026-09-01' }, 'no candidate at all'],
    [{ candidateName: '', companyName: company, position: 'X', startDate: '2026-09-01' }, 'an empty name'],
    [{ candidateName: 'A', companyName: '', position: 'X', startDate: '2026-09-01' }, 'an empty company'],
    [{ candidateName: 'A', companyName: company, position: 'X', startDate: '2026-09-10', endDate: '2026-09-01' }, 'end before start'],
    [{ candidateName: 'A', companyName: company, position: 'X', startDate: '31-12-2026' }, 'a non-ISO date'],
    [{ candidateName: 'A', companyName: company, position: 'X', startDate: '2026-09-01', monthlyRemuneration: '-100' }, 'negative pay'],
    [{ candidateName: 'A', companyName: company, position: 'X', startDate: '2026-09-01', monthlyRemuneration: '1.234' }, 'pay with 3 decimals'],
    [{ candidateName: 'A', companyName: company, position: 'X', startDate: '2026-09-01', contractType: 'epc' }, 'unknown contract type'],
    [{ candidateName: 'A', companyName: company, position: 'X', startDate: '2026-09-01', sector: 'ports' }, 'unknown sector'],
    [{ candidateName: 'A', companyName: 'c'.repeat(256), position: 'X', startDate: '2026-09-01' }, 'company over 255 chars'],
    [{ workerId: '00000000-0000-4000-8000-000000000000', companyName: company, position: 'X', startDate: '2026-09-01' }, 'unknown candidate', 404],
    [{ candidateName: 'A', clientId: '00000000-0000-4000-8000-000000000000', companyName: company, position: 'X', startDate: '2026-09-01' }, 'unknown client', 404],
  ]) {
    const r = await P(body);
    check(`placement rejects ${name} → ${code}`, r.status === code, `got ${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
  }
  const pid = plc.data.id;
  const edit = await api(`/v1/admin/placements/${pid}`, { method: 'PATCH', token: A, body: { status: 'completed', endDate: '2026-09-15' } });
  check('edit placement → 200', edit.status === 200 && edit.data.status === 'completed' && edit.data.endDate === '2026-09-15', JSON.stringify(edit.data).slice(0, 150));
  const clear = await api(`/v1/admin/placements/${pid}`, { method: 'PATCH', token: A, body: { endDate: null, status: 'active' } });
  check('end date can be cleared with null', clear.status === 200 && clear.data.endDate === null, JSON.stringify(clear.data?.endDate));
  const badEdit = await api(`/v1/admin/placements/${pid}`, { method: 'PATCH', token: A, body: { endDate: '2026-07-01' } });
  check('edit: end before the stored start → 400', badEdit.status === 400, `got ${badEdit.status}`);
  const fl = await api(`/v1/admin/placements?q=${encodeURIComponent(company)}&status=active`, { token: A });
  check('placement search + status filter', fl.data.data.some((p) => p.id === pid) && fl.data.data.every((p) => p.status === 'active'));
  const byWorker = await api(`/v1/admin/placements?workerId=${w.profileId}`, { token: A });
  check('placements filtered to one candidate', byWorker.data.total === 1);
  const companies = await api('/v1/admin/companies', { token: A });
  check('company list for autocomplete includes it', companies.data.includes(company));
  const del = await api(`/v1/admin/placements/${offPlatform.data.id}`, { method: 'DELETE', token: A });
  check('delete placement → 200', del.status === 200);
  check('deleting it again → 404', (await api(`/v1/admin/placements/${offPlatform.data.id}`, { method: 'DELETE', token: A })).status === 404);

  section('Auto placement when a client accepts');
  const job = await api('/v1/jobs', {
    method: 'POST',
    token: state.client.token,
    body: { categoryId: state.officeCategoryId, title: 'Document Controller, DFC Pkg 3', location: 'Ahmedabad', offeredRate: '40000', rateUnit: 'month', startsAt: '2026-10-01T00:00:00.000Z' },
  });
  check('client posts a monthly job', job.status === 201, `got ${job.status} ${JSON.stringify(job.data).slice(0, 150)}`);
  const app = await api(`/v1/jobs/${job.data.id}/applications`, { method: 'POST', token: state.json.token, body: { proposedRate: '38000', message: 'Interested' } });
  check('candidate applies', app.status === 201, `got ${app.status}`);
  const acc = await api(`/v1/applications/${app.data.id}`, { method: 'PATCH', token: state.client.token, body: { status: 'accepted' } });
  check('client accepts', acc.status === 200, `got ${acc.status}`);
  const auto = await api(`/v1/admin/placements?workerId=${state.json.profileId}`, { token: A });
  const ap = auto.data.data[0];
  check('a placement was recorded automatically', auto.data.total === 1, `total ${auto.data.total}`);
  check('…under the client’s company', ap?.companyName === `Acme Consult ${stamp}` && ap?.clientId === state.client.profileId);
  check('…with the monthly rate and start date', ap?.monthlyRemuneration === '38000.00' && ap?.startDate === '2026-10-01', JSON.stringify(ap));
  await api(`/v1/applications/${app.data.id}`, { method: 'PATCH', token: state.client.token, body: { status: 'accepted' } });
  check('accepting twice does not duplicate it', (await api(`/v1/admin/placements?workerId=${state.json.profileId}`, { token: A })).data.total === 1);

  // ------------------------------------------------------------------
  section('Dashboard statistics');
  const stats = await api('/v1/admin/stats', { token: A });
  check('stats 200', stats.status === 200);
  const s = stats.data;
  check('12 weekly buckets', s.weekly.length === 12);
  check('12 monthly placement buckets', s.placementsMonthly.length === 12);
  check('this week counts the new sign-ups', s.weekly[11].candidates >= 3, JSON.stringify(s.weekly[11]));
  check('totals are numbers, not strings', typeof s.totals.candidates === 'number');
  check('placements by company includes the test company', s.byCompany.some((c) => c.key === company) || s.byCompany.length === 12);
  check('pipeline counts add up to all candidates', s.byPipeline.reduce((a, b) => a + b.count, 0) === s.totals.candidates, `${s.byPipeline.reduce((a, b) => a + b.count, 0)} vs ${s.totals.candidates}`);
  check('department counts add up to all candidates', s.byGroup.reduce((a, b) => a + b.count, 0) === s.totals.candidates);
  const week = await api('/v1/admin/stats?days=7', { token: A });
  check('days=7 scopes the breakdowns', week.status === 200 && week.data.byGroup.reduce((a, b) => a + b.count, 0) <= s.totals.candidates);
  check('days=3 is rejected → 400', (await api('/v1/admin/stats?days=3', { token: A })).status === 400);

  section('CSV export');
  const evilPhone = newPhone();
  const evil = await register({ phone: evilPhone, firstName: '=HYPERLINK("http://evil","x")', lastName: 'Comma, "Quote"', city: '+cmd|calc' }, null);
  created.push(evil.data.user.id);
  const csv = await fetch(`${API}/v1/admin/candidates/export?q=${encodeURIComponent(evilPhone)}`, { headers: { Authorization: `Bearer ${A}` } });
  // Read raw bytes: text() would silently strip the BOM being checked for.
  const bytes = Buffer.from(await csv.arrayBuffer());
  const body = bytes.toString('utf8');
  check('export is text/csv', /text\/csv/.test(csv.headers.get('content-type') ?? ''));
  check('export has a dated filename', /candidates-\d{4}-\d{2}-\d{2}\.csv/.test(csv.headers.get('content-disposition') ?? ''));
  check('export starts with a UTF-8 BOM for Excel', bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf);
  check('export is filtered: header + 1 row', body.trim().split('\r\n').length === 2, `${body.trim().split('\r\n').length} lines`);
  check('formula in a name is neutralised', body.includes(`"'=HYPERLINK(""http://evil"",""x"") Comma, ""Quote"""`), body.split('\r\n')[1]?.slice(0, 120));
  check('formula in a city is neutralised', body.includes(`'+cmd|calc`));
  const tamilCsv = await fetch(`${API}/v1/admin/candidates/export?q=${encodeURIComponent('சுரேஷ்')}`, { headers: { Authorization: `Bearer ${A}` } }).then((r) => r.text());
  check('Tamil text survives the export', tamilCsv.includes('சுரேஷ்'));

  // ------------------------------------------------------------------
  section('Accounts: deactivate, reactivate, delete');
  const deact = await api(`/v1/admin/users/${w.userId}/active`, { method: 'PATCH', token: A, body: { isActive: false } });
  check('deactivate → 200', deact.status === 200);
  check('their existing access token stops working at once', (await api('/v1/workers/me', { token: w.token })).status === 401);
  check('their refresh token is revoked', (await api('/v1/auth/refresh', { method: 'POST', body: { refreshToken: w.refresh } })).status === 401);
  check('they cannot log in', (await api('/v1/auth/login', { method: 'POST', body: { phone: reg.phone, password: 'secret123' } })).status === 401);
  check('hidden from client browsing', !(await api('/v1/workers?pageSize=100', { token: state.client.token })).data.data.some((p) => p.id === w.profileId));
  check('isActive=false filter finds them', (await list(`?isActive=false&q=${encodeURIComponent(reg.phone)}`)).data.total === 1);
  check('isActive must be a boolean → 400', (await api(`/v1/admin/users/${w.userId}/active`, { method: 'PATCH', token: A, body: { isActive: 'no' } })).status === 400);
  const react = await api(`/v1/admin/users/${w.userId}/active`, { method: 'PATCH', token: A, body: { isActive: true } });
  check('reactivate → 200', react.status === 200);
  check('they can log in again', (await api('/v1/auth/login', { method: 'POST', body: { phone: reg.phone, password: 'secret123' } })).status === 200);

  check('admin cannot deactivate themself → 403', (await api(`/v1/admin/users/${state.adminUserId}/active`, { method: 'PATCH', token: A, body: { isActive: false } })).status === 403);
  check('admin cannot delete themself → 403', (await api(`/v1/admin/users/${state.adminUserId}`, { method: 'DELETE', token: A })).status === 403);
  check('unknown account → 404', (await api('/v1/admin/users/00000000-0000-4000-8000-000000000000', { method: 'DELETE', token: A })).status === 404);

  const delW = await api(`/v1/admin/users/${w.userId}`, { method: 'DELETE', token: A });
  check('delete candidate → 200', delW.status === 200, `got ${delW.status}`);
  check('their profile is gone', (await api(`/v1/admin/candidates/${w.profileId}`, { token: A })).status === 404);
  check('their resume is gone', (await api(`/v1/admin/candidates/${w.profileId}/resume`, { token: A })).status === 404);
  const kept = await api(`/v1/admin/placements/${pid}`, { method: 'PATCH', token: A, body: { notes: 'still here' } });
  check('their placement history survives, name kept', kept.status === 200 && kept.data.workerId === null && kept.data.candidateName.includes('சுரேஷ்'));
  check('the freed phone number can register again', (await register({ phone: reg.phone }, null)).status === 201);

  const delC = await api(`/v1/admin/users/${state.client.userId}`, { method: 'DELETE', token: A });
  check('delete client → 200', delC.status === 200);
  check('their jobs are gone', (await api(`/v1/jobs/${job.data.id}`)).status === 404);
  const autoAfter = await api(`/v1/admin/placements?workerId=${state.json.profileId}`, { token: A });
  check('the auto placement survives with the company name', autoAfter.data.data[0]?.clientId === null && autoAfter.data.data[0]?.companyName === `Acme Consult ${stamp}`);

  // ------------------------------------------------------------------
  section('Admins and passwords');
  const a2Phone = newPhone();
  const a2 = await api('/v1/admin/admins', { method: 'POST', token: A, body: { phone: a2Phone, password: 'secondadmin1', email: `a2${stamp}@yukti.example` } });
  check('add a second admin → 201', a2.status === 201, `got ${a2.status}`);
  check('duplicate admin phone → 409', (await api('/v1/admin/admins', { method: 'POST', token: A, body: { phone: a2Phone, password: 'secondadmin1' } })).status === 409);
  check('admin with a short password → 400', (await api('/v1/admin/admins', { method: 'POST', token: A, body: { phone: newPhone(), password: 'short' } })).status === 400);
  const a2Login = await api('/v1/auth/login', { method: 'POST', body: { phone: a2Phone, password: 'secondadmin1' } });
  check('new admin can log in and lands as admin', a2Login.data?.user?.role === 'admin');
  const T2 = a2Login.data.accessToken;
  check('wrong current password → 401', (await api('/v1/auth/change-password', { method: 'POST', token: T2, body: { currentPassword: 'wrong-one', newPassword: 'brandnew123' } })).status === 401);
  check('new password too short → 400', (await api('/v1/auth/change-password', { method: 'POST', token: T2, body: { currentPassword: 'secondadmin1', newPassword: 'short' } })).status === 400);
  const cp = await api('/v1/auth/change-password', { method: 'POST', token: T2, body: { currentPassword: 'secondadmin1', newPassword: 'brandnew123' } });
  check('change password → 200', cp.status === 200);
  check('old refresh token revoked after the change', (await api('/v1/auth/refresh', { method: 'POST', body: { refreshToken: a2Login.data.refreshToken } })).status === 401);
  check('old password no longer works', (await api('/v1/auth/login', { method: 'POST', body: { phone: a2Phone, password: 'secondadmin1' } })).status === 401);
  check('new password works', (await api('/v1/auth/login', { method: 'POST', body: { phone: a2Phone, password: 'brandnew123' } })).status === 200);
  check('first admin deactivates the second', (await api(`/v1/admin/users/${a2.data.id}/active`, { method: 'PATCH', token: A, body: { isActive: false } })).status === 200);
  check('deactivated admin is locked out of the panel', (await api('/v1/admin/stats', { token: T2 })).status === 401);
  check('deleting an inactive admin is allowed', (await api(`/v1/admin/users/${a2.data.id}`, { method: 'DELETE', token: A })).status === 200);

  section('Activity log');
  const audit = await api('/v1/admin/audit?pageSize=100', { token: A });
  const actions = new Set(audit.data.data.map((e) => e.action));
  for (const a of ['candidate.update', 'placement.create', 'placement.update', 'placement.delete', 'account.deactivate', 'account.activate', 'account.delete', 'admin.create']) {
    check(`activity log records ${a}`, actions.has(a));
  }
  check('activity is newest first', audit.data.data.every((e, i, arr) => i === 0 || arr[i - 1].createdAt >= e.createdAt));
  check('activity filtered by type', (await api('/v1/admin/audit?targetType=placement', { token: A })).data.data.every((e) => e.targetType === 'placement'));

  // Clean up what's left (deleted users are already gone).
  for (const id of created) await api(`/v1/admin/users/${id}`, { method: 'DELETE', token: A });

  console.log(`\n${'='.repeat(56)}`);
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  console.log('='.repeat(56));
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
