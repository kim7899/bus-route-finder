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
 function formatKoreanDate(value) {
  if (!value) return '미정';

  return new Date(value).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatStatus(status) {
  const labels = {
    RESERVED: '예약 완료',
    CANCELLED: '예약 취소',
    COMPLETED: '이용 완료'
  };

  return labels[status] || status;
}
function formatFare(value) {
  if (value == null || value === '') {
    return '정보 없음';
  }

  const amount = Number(value);

  return Number.isFinite(amount) && amount >= 0
    ? `${amount.toLocaleString('ko-KR')}원`
    : '정보 없음';
}

async function loadMyReservations() {
  try {
    const { reservations } = await request(
      '/api/reservations',
      null,
      'GET'
    );

    const list = $('my-reservations-list');
    list.replaceChildren();

    if (!reservations.length) {
      const empty = document.createElement('li');
      empty.textContent = '예약 내역이 없습니다.';
      list.append(empty);
    }

    for (const r of reservations) {
      const item = document.createElement('li');
      item.className = 'reservation-item';

      const title = document.createElement('h3');
      title.textContent = `예약 #${r.id}`;

      const journey = document.createElement('p');
      journey.textContent =
        `${r.start_name} → ${r.end_name}`;

      const date = document.createElement('p');
      date.textContent =
        `출발: ${formatKoreanDate(r.departure_time)}`;

      const status = document.createElement('p');
      status.textContent =
        `상태: ${formatStatus(r.status)}`;

      item.append(title, journey, date, status);

      // DB에 저장된 경로 정보 읽기
      let route = r.route_data;

      if (typeof route === 'string') {
        try {
          route = JSON.parse(route);
        } catch {
          route = null;
        }
      }

      if (route && typeof route === 'object') {
        const segments = Array.isArray(route.segments)
          ? route.segments
          : [];

        const buses = segments.filter(
          segment => segment.type === 'BUS'
        );

        const details = document.createElement('div');
        details.className = 'reservation-details';

        const busInfo = document.createElement('p');
        busInfo.textContent = buses.length
          ? `버스: ${buses.map(bus => bus.busNumber || '번호 미상').join(' → ')}`
          : '버스 정보 없음';

        const transfer = document.createElement('p');
        transfer.textContent =
          `환승: ${route.transferCount ?? '정보 없음'}${route.transferCount != null ? '회' : ''}`;

        const fare = document.createElement('p');
        fare.textContent =
          `예상 요금: ${formatFare(route.totalFare)}`;

        const routeList = document.createElement('ol');

        for (const bus of buses) {
          const stop = document.createElement('li');

          stop.textContent =
            `${bus.busNumber || '번호 미상'}번 버스: ` +
            `${bus.from || '승차 정류장 미상'} → ` +
            `${bus.to || '하차 정류장 미상'}`;

          routeList.append(stop);
        }

        details.append(busInfo, transfer, fare, routeList);
        item.append(details);
      }

      if (r.status === 'RESERVED') {
        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'cancel-reservation';
        cancelButton.textContent = '예약 취소';

        cancelButton.addEventListener('click', async () => {
          if (!confirm(`예약 #${r.id}을 취소하시겠습니까?`)) {
            return;
          }

          cancelButton.disabled = true;

          try {
            await request(
              `/api/reservations/${r.id}/cancel`,
              null,
              'PATCH'
            );

            await loadMyReservations();
          } catch (error) {
            alert(error.message);
            cancelButton.disabled = false;
          }
        });

        item.append(cancelButton);
      }

      list.append(item);
    }

    $('my-reservations').hidden = false;
  } catch (error) {
    console.error('예약 조회 실패:', error);
    alert(error.message);
  }
}

$('my-reservations-button').addEventListener(
  'click',
  loadMyReservations
);
(async () => {
  try {
    showApp((await request('/api/auth/me', null, 'GET')).user);
  } catch {
    showLogin();
  }
})();