import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { getAll, getOne, runQuery } from '../config/database';

const router = Router();

interface Worker {
  id: string;
  name: string;
  role: string;
  phone: string;
  farm_id: string;
  daily_rate: number;
  hire_date: string;
  status: string;
  created_at: string;
}

interface Attendance {
  id: string;
  worker_id: string;
  date: string;
  check_in: string;
  check_out?: string;
  hours_worked?: number;
  task?: string;
  notes?: string;
}

interface CreateWorkerBody {
  name: string;
  role: string;
  phone: string;
  farm_id: string;
  daily_rate: number;
  hire_date: string;
}

interface UpdateWorkerBody {
  name?: string;
  role?: string;
  phone?: string;
  farm_id?: string;
  daily_rate?: number;
  status?: string;
}

interface CheckoutBody {
  task?: string;
  notes?: string;
}

router.get('/', auth, async (req: Request, res: Response) => {
  try {
    const workers = getAll('SELECT * FROM workers ORDER BY created_at DESC') as Worker[];
    res.json({ ok: true, data: workers });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/:id', auth, async (req: Request, res: Response) => {
  try {
    const worker = getOne('SELECT * FROM workers WHERE id = ?', [req.params.id]) as Worker | undefined;
    if (!worker) {
      res.status(404).json({ ok: false, error: 'Worker not found' });
      return;
    }
    
    const attendance = getAll(
      'SELECT * FROM worker_attendance WHERE worker_id = ? ORDER BY date DESC LIMIT 30',
      [req.params.id]
    ) as Attendance[];
    const totalHours = getOne(
      'SELECT SUM(hours_worked) as total FROM worker_attendance WHERE worker_id = ?',
      [req.params.id]
    ) as { total: number } | undefined;
    
    res.json({ ok: true, data: { worker, attendance, totalHours: totalHours?.total || 0 } });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.post('/', auth, async (req: Request, res: Response) => {
  try {
    const { name, role, phone, farm_id, daily_rate, hire_date } = req.body as CreateWorkerBody;
    const id = 'worker-' + Date.now();
    runQuery(
      'INSERT INTO workers (id, name, role, phone, farm_id, daily_rate, hire_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))',
      [id, name, role, phone, farm_id, daily_rate, hire_date]
    );
    res.json({ ok: true, data: { id, name } });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.put('/:id', auth, async (req: Request, res: Response) => {
  try {
    const { name, role, phone, farm_id, daily_rate, status } = req.body as UpdateWorkerBody;
    const updates: string[] = [];
    const params: (string | number)[] = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (role) { updates.push('role = ?'); params.push(role); }
    if (phone) { updates.push('phone = ?'); params.push(phone); }
    if (farm_id) { updates.push('farm_id = ?'); params.push(farm_id); }
    if (daily_rate) { updates.push('daily_rate = ?'); params.push(daily_rate); }
    if (status) { updates.push('status = ?'); params.push(status); }
    params.push(req.params.id);
    
    runQuery(`UPDATE workers SET ${updates.join(', ')}, updated_at = datetime("now") WHERE id = ?`, params);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.delete('/:id', auth, async (req: Request, res: Response) => {
  try {
    runQuery('UPDATE workers SET status = "inactive", updated_at = datetime("now") WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.post('/:id/checkin', auth, async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const existing = getOne(
      'SELECT * FROM worker_attendance WHERE worker_id = ? AND date = ?',
      [req.params.id, today]
    );
    if (existing) {
      res.status(400).json({ ok: false, error: 'Already checked in today' });
      return;
    }
    
    const id = 'att-' + Date.now();
    runQuery(
      'INSERT INTO worker_attendance (id, worker_id, date, check_in, created_at) VALUES (?, ?, ?, datetime("now"), datetime("now"))',
      [id, req.params.id, today]
    );
    res.json({ ok: true, data: { id, checkIn: new Date().toISOString() } });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.post('/:id/checkout', auth, async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const attendance = getOne(
      'SELECT * FROM worker_attendance WHERE worker_id = ? AND date = ?',
      [req.params.id, today]
    ) as Attendance | undefined;
    if (!attendance) {
      res.status(400).json({ ok: false, error: 'Not checked in today' });
      return;
    }
    
    const checkIn = new Date(attendance.check_in).getTime();
    const hoursWorked = (Date.now() - checkIn) / 3600000;
    const { task, notes } = req.body as CheckoutBody;
    
    runQuery(
      'UPDATE worker_attendance SET check_out = datetime("now"), hours_worked = ?, task = ?, notes = ? WHERE id = ?',
      [hoursWorked.toFixed(1), task, notes, attendance.id]
    );
    res.json({ ok: true, data: { hoursWorked: hoursWorked.toFixed(1) } });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/:id/stats', auth, async (req: Request, res: Response) => {
  try {
    const worker = getOne('SELECT * FROM workers WHERE id = ?', [req.params.id]) as Worker | undefined;
    if (!worker) {
      res.status(404).json({ ok: false, error: 'Worker not found' });
      return;
    }
    
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthly = getOne(
      'SELECT SUM(hours_worked) as hours, COUNT(*) as days FROM worker_attendance WHERE worker_id = ? AND date LIKE ?',
      [req.params.id, thisMonth + '%']
    ) as { hours: number; days: number } | undefined;
    const allTime = getOne(
      'SELECT SUM(hours_worked) as hours, COUNT(*) as days FROM worker_attendance WHERE worker_id = ?',
      [req.params.id]
    ) as { hours: number; days: number } | undefined;
    
    res.json({
      ok: true,
      data: {
        worker,
        thisMonth: { hours: monthly?.hours || 0, days: monthly?.days || 0 },
        allTime: { hours: allTime?.hours || 0, days: allTime?.days || 0 }
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

export default router;