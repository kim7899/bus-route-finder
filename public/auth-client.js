const $ = id => document.getElementById(id);
async function request(url, data, method = 'POST') {
  const response = await fetch(url, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || '요청 실패');
  return result;
}
function showApp(user) {
  $('auth-screen').hidden = true;
  $('app-screen').hidden = false;
  $('user-greeting').textContent = `${user.name}님`;
}
function showLogin() {
  $('auth-screen').hidden = false;
  $('app-screen').hidden = true;
  $('user-greeting').textContent = '';
}
$('login-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const result = await request('/api/auth/login', {
      loginId: $('login-id').value,
      password: $('login-password').value
    });
    $('auth-message').textContent = '';
    showApp(result.user);
  } catch (e) { $('auth-message').textContent = e.message; }
});
$('register-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const result = await request('/api/auth/register', {
      name: $('register-name').value,
      loginId: $('register-id').value,
      password: $('register-password').value,
      birthDate: $('register-birth').value,
      email: $('register-email').value,
      phone: $('register-phone').value
    });
    $('auth-message').textContent = '';
    showApp(result.user);
  } catch (e) { $('auth-message').textContent = e.message; }
});
$('logout-button').addEventListener('click', async () => {
  await request('/api/auth/logout');
  showLogin();
});
$('show-register').addEventListener('click', () => {
  $('login-form').hidden = true;
  $('register-form').hidden = false;
  $('auth-message').textContent = '';
});
$('show-login').addEventListener('click', () => {
  $('login-form').hidden = false;
  $('register-form').hidden = true;
  $('auth-message').textContent = '';
});
$('my-reservations-button').addEventListener('click', async () => {
  try {
    const { reservations } = await request('/api/reservations', null, 'GET');
    const list = $('my-reservations-list');
    list.replaceChildren();
    if (!reservations.length) list.textContent = '예약 내역이 없습니다.';
    for (const r of reservations) {
      const item = document.createElement('li');
      item.textContent = `#${r.id} ${r.start_name} → ${r.end_name} / ${r.status} / 출발 ${r.departure_time || '미정'}`;
      list.append(item);
    }
    $('my-reservations').hidden = false;
  } catch (e) { alert(e.message); }
});
(async () => {
  try { showApp((await request('/api/auth/me', null, 'GET')).user); }
  catch { showLogin(); }
})();
