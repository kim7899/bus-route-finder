
import { serviceDate } from './mobile-reservations.js';

// 기존 승객 앱 DB 구조를 기사 앱 집계 코드에 맞춰 변환
export function createDriverReservationDbAdapter(db) {
  return {
    async execute(sql, args = []) {
      if (!sql.includes('SELECT payload FROM mobile_reservations')) {
        throw new Error('지원하지 않는 DB 조회입니다.');
      }

      const [date] = args;

      // 기존 테이블: id, user_id, reservation_data
      const [rows] = await db.execute(
        'SELECT reservation_data FROM mobile_reservations'
      );

      const mapped = [];

      for (const row of rows) {
        try {
          const reservation =
            typeof row.reservation_data === 'string'
              ? JSON.parse(row.reservation_data)
              : row.reservation_data;

          if (!reservation) continue;
          if (!Number.isSafeInteger(reservation.createdAt)) continue;
          if (serviceDate(reservation.createdAt) !== date) continue;

          if (!['RESERVED', 'BOARDED'].includes(
            reservation.boardingStatus
          )) continue;

          console.log('[DRIVER DB] 예약 통과:', {
          id: reservation.id,
          routeNumber: reservation.routeNumber,
          boardingStatus: reservation.boardingStatus,
          createdAt: reservation.createdAt
        });

      mapped.push({ payload: reservation })
        } catch {
          // 잘못된 예약 데이터는 제외
        }
      }
      console.log('[DRIVER DB] 조회 날짜:', date);
      console.log('[DRIVER DB] DB 전체 건수:', rows.length);
      console.log('[DRIVER DB] 최종 전달 건수:', mapped.length);
      return [mapped, []];
    }
  };
}
