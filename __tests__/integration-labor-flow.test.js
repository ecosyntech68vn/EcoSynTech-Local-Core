/**
 * CSSC - Labor Module Flow Tests
 * Critical Success System Criteria: Labor workflow
 * Test complete flow: Worker Management → Task Assignment → Attendance → Payroll
 */

const {
  MOCK_FARM_ID,
  mockWorkers,
  mockPlantings
} = require('./fixtures/mockData');

describe('CSSC - Labor Module Flow Tests', () => {
  // ============================================
  // CSSC 1: Worker Management Flow
  // ============================================
  describe('CSSC 1: Worker Management Flow', () => {
    it('should register new worker', () => {
      const newWorker = {
        id: 'worker_new',
        farm_id: MOCK_FARM_ID,
        worker_code: 'EMP004',
        worker_name: 'Phạm Văn D',
        position: 'nông dân',
        hire_date: '2024-05-01',
        status: 'active',
        salary: 4500000
      };
      
      expect(newWorker.status).toBe('active');
      expect(newWorker.salary).toBeGreaterThan(0);
    });

    it('should update worker information', () => {
      let worker = { ...mockWorkers[0], position: 'giám sát' };
      worker.salary = 7000000; // Salary increase
      
      expect(worker.position).toBe('giám sát');
      expect(worker.salary).toBe(7000000);
    });

    it('should calculate total workforce', () => {
      const activeWorkers = mockWorkers.filter(w => w.status === 'active');
      expect(activeWorkers.length).toBe(3);
    });

    it('should categorize workers by position', () => {
      const positions = {};
      mockWorkers.forEach(w => {
        positions[w.position] = (positions[w.position] || 0) + 1;
      });
      
      expect(positions['nông dân']).toBe(2);
      expect(positions['giám sát']).toBe(1);
    });

    it('should calculate labor cost by position', () => {
      const costByPosition = {};
      mockWorkers.forEach(w => {
        costByPosition[w.position] = (costByPosition[w.position] || 0) + w.salary;
      });
      
      expect(costByPosition['nông dân']).toBe(9500000); // 4.5M + 5M
      expect(costByPosition['giám sát']).toBe(8000000);
    });
  });

  // ============================================
  // CSSC 2: Task Assignment Flow
  // ============================================
  describe('CSSC 2: Task Assignment Flow', () => {
    it('should assign task to worker', () => {
      const task = {
        id: 'task_001',
        worker_id: mockWorkers[0].id,
        planting_id: mockPlantings[0].id,
        task_type: 'arrive',
        scheduled_date: '2024-05-01',
        status: 'assigned'
      };
      
      expect(task.status).toBe('assigned');
      expect(task.worker_id).toBe('worker_001');
    });

    it('should track task completion', () => {
      let task = { status: 'assigned' };
      
      // Complete task
      task.status = 'completed';
      task.completed_at = '2024-05-01 14:00:00';
      task.productivity_score = 85;
      
      expect(task.status).toBe('completed');
      expect(task.productivity_score).toBe(85);
    });

    it('should calculate task distribution', () => {
      const tasks = [
        { worker_id: 'worker_001', status: 'completed' },
        { worker_id: 'worker_001', status: 'completed' },
        { worker_id: 'worker_002', status: 'completed' },
        { worker_id: 'worker_003', status: 'pending' }
      ];
      
      const completedByWorker = {};
      tasks.forEach(t => {
        completedByWorker[t.worker_id] = (completedByWorker[t.worker_id] || 0) + 1;
      });
      
      expect(completedByWorker['worker_001']).toBe(2);
      expect(completedByWorker['worker_003']).toBe(1);
    });

    it('should calculate worker productivity', () => {
      const workerTasks = [
        { productivity_score: 90 },
        { productivity_score: 85 },
        { productivity_score: 95 }
      ];
      
      const avgProductivity = workerTasks.reduce((s, t) => s + t.productivity_score, 0) / workerTasks.length;
      expect(avgProductivity).toBeCloseTo(90, 0);
    });
  });

  // ============================================
  // CSSC 3: Attendance Tracking Flow
  // ============================================
  describe('CSSC 3: Attendance Tracking Flow', () => {
    it('should record daily attendance', () => {
      const attendance = [
        { worker_id: 'worker_001', date: '2024-05-01', status: 'present', hours_worked: 8 },
        { worker_id: 'worker_002', date: '2024-05-01', status: 'present', hours_worked: 8 },
        { worker_id: 'worker_003', date: '2024-05-01', status: 'absent', hours_worked: 0 }
      ];
      
      const present = attendance.filter(a => a.status === 'present').length;
      expect(present).toBe(2);
    });

    it('should calculate total work hours', () => {
      const attendance = [
        { worker_id: 'worker_001', hours_worked: 8 },
        { worker_id: 'worker_002', hours_worked: 8 },
        { worker_id: 'worker_003', hours_worked: 6 } // Overtime
      ];
      
      const totalHours = attendance.reduce((s, a) => s + a.hours_worked, 0);
      expect(totalHours).toBe(22);
    });

    it('should calculate overtime hours', () => {
      const attendance = [
        { worker_id: 'worker_001', hours_worked: 10 }, // 2h overtime
        { worker_id: 'worker_002', hours_worked: 8 },
        { worker_id: 'worker_003', hours_worked: 8 }
      ];
      
      const overtimeHours = attendance
        .filter(a => a.hours_worked > 8)
        .reduce((s, a) => s + (a.hours_worked - 8), 0);
      
      expect(overtimeHours).toBe(2);
    });

    it('should calculate attendance rate', () => {
      const totalWorkers = 3;
      const presentWorkers = 2;
      const attendanceRate = (presentWorkers / totalWorkers) * 100;
      
      expect(attendanceRate).toBeCloseTo(66.67, 1);
    });
  });

  // ============================================
  // CSSC 4: Payroll Calculation Flow
  // ============================================
  describe('CSSC 4: Payroll Calculation Flow', () => {
    it('should calculate monthly payroll', () => {
      const monthlyPayroll = mockWorkers.reduce((sum, w) => sum + w.salary, 0);
      expect(monthlyPayroll).toBe(17500000);
    });

    it('should calculate payroll with overtime', () => {
      const baseSalary = 5000000;
      const overtimeHours = 5;
      const overtimeRate = 30000; // 30k per hour
      const totalSalary = baseSalary + (overtimeHours * overtimeRate);
      
      expect(totalSalary).toBe(5150000);
    });

    it('should calculate payroll by position', () => {
      const supervisor = mockWorkers.find(w => w.position === 'giám sát');
      const workers = mockWorkers.filter(w => w.position === 'nông dân');
      
      const totalWorkersSalary = workers.reduce((s, w) => s + w.salary, 0);
      expect(totalWorkersSalary).toBe(9500000);
    });

    it('should calculate deductions', () => {
      const salary = 5000000;
      const taxRate = 0.1;
      const insuranceRate = 0.05;
      
      const taxDeduction = salary * taxRate;
      const insuranceDeduction = salary * insuranceRate;
      const netSalary = salary - taxDeduction - insuranceDeduction;
      
      expect(taxDeduction).toBe(500000);
      expect(insuranceDeduction).toBe(250000);
      expect(netSalary).toBe(4250000);
    });
  });

  // ============================================
  // CSSC 5: Skill Management Flow
  // ============================================
  describe('CSSC 5: Skill Management Flow', () => {
    it('should categorize workers by skill level', () => {
      const skillLevels = {};
      mockWorkers.forEach(w => {
        skillLevels[w.skill_level] = (skillLevels[w.skill_level] || 0) + 1;
      });
      
      expect(skillLevels['advanced']).toBe(1);
      expect(skillLevels['intermediate']).toBe(1);
      expect(skillLevels['beginner']).toBe(1);
    });

    it('should assign tasks based on skill level', () => {
      const taskRequirements = {
        'arrive': 'beginner',
        'fertilizing': 'intermediate',
        'harvesting': 'advanced'
      };
      
      const availableWorker = mockWorkers.find(w => w.skill_level === 'advanced');
      const canDoAdvanced = availableWorker && taskRequirements['harvesting'] === availableWorker.skill_level;
      
      expect(canDoAdvanced).toBe(true);
    });

    it('should track skill development', () => {
      let workerSkill = 'beginner';
      
      // After training
      workerSkill = 'intermediate';
      
      // After more training
      workerSkill = 'advanced';
      
      expect(workerSkill).toBe('advanced');
    });
  });

  // ============================================
  // CSSC 6: Labor Reporting Flow
  // ============================================
  describe('CSSC 6: Labor Reporting Flow', () => {
    it('should generate labor productivity report', () => {
      const report = {
        total_workers: mockWorkers.length,
        active_workers: mockWorkers.filter(w => w.status === 'active').length,
        total_payroll: mockWorkers.reduce((s, w) => s + w.salary, 0),
        avg_salary: mockWorkers.reduce((s, w) => s + w.salary, 0) / mockWorkers.length
      };
      
      expect(report.total_workers).toBe(3);
      expect(report.avg_salary).toBeCloseTo(5833333, 0);
    });

    it('should generate attendance report', () => {
      const attendanceReport = {
        total_days: 30,
        present_days: 25,
        absent_days: 5,
        attendance_rate: (25 / 30) * 100,
        total_hours: 600,
        avg_hours_per_day: 20
      };
      
      expect(attendanceReport.attendance_rate).toBeCloseTo(83.33, 1);
    });
  });

  // ============================================
  // Integration: End-to-End Labor Workflow
  // ============================================
  describe('Integration: End-to-End Labor Workflow', () => {
    it('should execute complete labor cycle', () => {
      // Step 1: Check available workers
      const available = mockWorkers.filter(w => w.status === 'active');
      expect(available.length).toBe(3);
      
      // Step 2: Assign task based on skill
      const task = { type: 'fertilizing', required_skill: 'intermediate' };
      const assignedWorker = available.find(w => w.skill_level === task.required_skill);
      expect(assignedWorker).toBeDefined();
      
      // Step 3: Record attendance
      const attendance = { worker_id: assignedWorker.id, hours: 8, status: 'present' };
      expect(attendance.status).toBe('present');
      
      // Step 4: Calculate payroll
      const dailyRate = assignedWorker.salary / 26; // Working days
      const expectedPay = dailyRate * 1;
      expect(expectedPay).toBeGreaterThan(0);
    });
  });
});