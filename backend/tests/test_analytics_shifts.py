import atexit
import os
import tempfile
from datetime import date, timedelta
from pathlib import Path
import unittest

from sqlalchemy import select

_TEST_DIR = tempfile.TemporaryDirectory()
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_TEST_DIR.name) / 'analytics_test.db'}"

from backend.app import create_app  # noqa: E402
from backend.app.db import SessionLocal, engine  # noqa: E402
from backend.app.models import Base, ScheduleShift, Staff  # noqa: E402


def _cleanup_tmpdir():
    try:
        engine.dispose()
    finally:
        _TEST_DIR.cleanup()


atexit.register(_cleanup_tmpdir)


class AnalyticsShiftTests(unittest.TestCase):
    def setUp(self):
        with engine.begin() as connection:
            Base.metadata.drop_all(connection)
        self.app = create_app()
        self.client = self.app.test_client()

    def tearDown(self):
        if hasattr(SessionLocal, "remove"):
            SessionLocal.remove()

    def _staff_auth_headers(self):
        response = self.client.post('/api/auth/login', json={'username': 'admin', 'password': 'admin'})
        self.assertEqual(response.status_code, 200, response.get_data(as_text=True))
        token = (response.get_json() or {}).get('access_token')
        self.assertTrue(token, 'expected access token for admin login')
        return {'Authorization': f'Bearer {token}'}

    def test_weekly_shift_summary_ranks_staff(self):
        headers = self._staff_auth_headers()
        week_start = date(2025, 10, 6)
        next_day = week_start + timedelta(days=1)

        with SessionLocal() as session:
            admin = session.scalar(select(Staff).where(Staff.username == 'admin'))
            staff_one = session.scalar(select(Staff).where(Staff.username == 'staff1'))
            staff_two = session.scalar(select(Staff).where(Staff.username == 'staff2'))
            self.assertIsNotNone(admin)
            self.assertIsNotNone(staff_one)
            self.assertIsNotNone(staff_two)

            session.add_all([
                ScheduleShift(staff_id=staff_one.id, shift_date=week_start, shift_name='10:00'),
                ScheduleShift(staff_id=staff_one.id, shift_date=week_start, shift_name='11:00'),
                ScheduleShift(staff_id=staff_one.id, shift_date=next_day, shift_name='10:00'),
                ScheduleShift(staff_id=staff_one.id, shift_date=next_day, shift_name='11:00'),
                ScheduleShift(staff_id=staff_one.id, shift_date=next_day, shift_name='12:00'),
                ScheduleShift(staff_id=staff_two.id, shift_date=week_start, shift_name='12:00'),
                ScheduleShift(staff_id=staff_two.id, shift_date=next_day, shift_name='13:00'),
            ])
            session.commit()

        response = self.client.get(f"/api/analytics/shifts?week_start={week_start.isoformat()}", headers=headers)
        self.assertEqual(response.status_code, 200, response.get_data(as_text=True))
        payload = response.get_json() or {}

        week_info = payload.get('week') or {}
        self.assertEqual(week_info.get('start_date'), week_start.isoformat())
        self.assertEqual(len(week_info.get('days') or []), 7)

        overview = payload.get('overview') or {}
        self.assertEqual(overview.get('total_shifts'), 7)
        self.assertEqual(overview.get('total_people'), 3)

        staff_entries = payload.get('staff') or []
        self.assertEqual(len(staff_entries), 3)

        by_name = {entry['full_name']: entry for entry in staff_entries}
        self.assertEqual(by_name['Staff One']['total_hours'], 5)
        self.assertEqual(by_name['Staff Two']['total_hours'], 2)
        self.assertEqual(by_name['Administrator']['total_hours'], 0)

        self.assertEqual(by_name['Staff One']['status'], 'overbooked')
        self.assertEqual(by_name['Administrator']['status'], 'underbooked')

        ranks = {entry['full_name']: entry['rank'] for entry in staff_entries}
        self.assertLess(ranks['Staff One'], ranks['Staff Two'])
        self.assertGreater(ranks['Administrator'], ranks['Staff Two'])

    def test_rejects_invalid_week_start(self):
        headers = self._staff_auth_headers()
        response = self.client.get('/api/analytics/shifts?week_start=invalid-date', headers=headers)
        self.assertEqual(response.status_code, 400)
        data = response.get_json() or {}
        self.assertIn('error', data)


if __name__ == '__main__':
    unittest.main()
