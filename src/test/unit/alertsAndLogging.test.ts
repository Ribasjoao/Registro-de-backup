import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateCompliance, processMissingBackupCheck, processBackupFailureAlert, processWeeklyComplianceReport } from '../../../functions/src/utils/alerts';
import { logAction as serverLogAction } from '../../../functions/src/utils/logger';
import { logAction as clientLogAction } from '../../services/auditService';
import { mockFirestoreFunctions } from '../mocks/firebaseMock';

// Mock client-side firebase
vi.mock('../../firebase', () => ({
  db: {},
  collection: (...args: any[]) => mockFirestoreFunctions.collection({}, args[1]),
  addDoc: (...args: any[]) => mockFirestoreFunctions.addDoc(...args),
  handleFirestoreError: vi.fn(),
  OperationType: { WRITE: 'write' },
}));

describe('Passo 6.1 — Testes do System Logging (audit_logs)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('client-side logAction deve gravar log com formato correto', async () => {
    await clientLogAction('usr-1', 'Operador Teste', 'CREATE_BACKUP', 'Criou backup Veeam');

    expect(mockFirestoreFunctions.addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'usr-1',
        userName: 'Operador Teste',
        action: 'CREATE_BACKUP',
        details: 'Criou backup Veeam',
        timestamp: expect.any(String),
      })
    );
  });

  it('server-side logAction em functions/src/utils/logger.ts deve gravar no Firestore e retornar ID', async () => {
    const mockDb = {
      collection: vi.fn().mockReturnValue({
        add: vi.fn().mockResolvedValue({ id: 'log-doc-999' })
      })
    } as any;

    const logId = await serverLogAction(mockDb, {
      userId: 'admin-123',
      userName: 'SysAdmin Root',
      action: 'UPDATE_BACKUP_STATUS',
      collection: 'backups',
      docId: 'bk-123',
      before: { status: 'failed' },
      after: { status: 'success' },
      details: 'Status atualizado manualmente'
    });

    expect(logId).toBe('log-doc-999');
    expect(mockDb.collection).toHaveBeenCalledWith('audit_logs');
  });
});

describe('Passo 6.2 — Testes de Cálculo de Conformidade', () => {
  const refDate = new Date('2026-07-31T12:00:00Z');

  it('deve retornar 100% de conformidade quando houver backups em todos os 7 dias', () => {
    const backups = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(refDate);
      d.setDate(refDate.getDate() - i);
      backups.push({
        timestamp: d.toISOString(),
        status: 'success'
      });
    }

    const res = calculateCompliance(backups, 7, refDate);
    expect(res.complianceRate).toBe(100);
    expect(res.daysWithBackupCount).toBe(7);
    expect(res.missingDates).toHaveLength(0);
  });

  it('deve retornar ~71% de conformidade quando houver backups em 5 de 7 dias', () => {
    const backups = [];
    // Dias 1, 2, 3, 4, 5 têm backup. Dias 6 e 7 não têm.
    for (let i = 1; i <= 5; i++) {
      const d = new Date(refDate);
      d.setDate(refDate.getDate() - i);
      backups.push({
        timestamp: d.toISOString(),
        status: 'success'
      });
    }

    const res = calculateCompliance(backups, 7, refDate);
    expect(res.complianceRate).toBe(71); // Math.round(5/7 * 100) = 71
    expect(res.daysWithBackupCount).toBe(5);
    expect(res.missingDates).toHaveLength(2);
  });

  it('deve retornar 0% de conformidade se não houver registros nos 7 dias', () => {
    const res = calculateCompliance([], 7, refDate);
    expect(res.complianceRate).toBe(0);
    expect(res.daysWithBackupCount).toBe(0);
    expect(res.missingDates).toHaveLength(7);
  });
});

describe('Passo 6.3 — Testes de Alertas Automatizados (Missing, Failure & Weekly)', () => {
  let mockDb: any;
  const refDate = new Date('2026-07-31T12:00:00Z');

  beforeEach(() => {
    const mockAuditCollection = {
      add: vi.fn().mockResolvedValue({ id: 'audit-log-1' })
    };
    const mockMailCollection = {
      add: vi.fn().mockResolvedValue({ id: 'mail-1' })
    };
    const mockNotificationsCollection = {
      add: vi.fn().mockResolvedValue({ id: 'notif-1' })
    };

    mockDb = {
      collection: vi.fn((colName: string) => {
        if (colName === 'audit_logs') return mockAuditCollection;
        if (colName === 'mail') return mockMailCollection;
        if (colName === 'notifications') return mockNotificationsCollection;
        if (colName === 'notifications_config') {
          return {
            doc: () => ({
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  activeChannel: 'none', // desativa envios externos em testes
                  emails: ['admin@test.com'],
                  webhookUrls: [],
                  missingBackupCheckTime: '08:00',
                  complianceThreshold: 80
                })
              })
            })
          };
        }
        return {
          get: vi.fn().mockResolvedValue({ docs: [] }),
          add: vi.fn().mockResolvedValue({ id: 'doc-1' })
        };
      })
    };
  });

  it('processMissingBackupCheck deve disparar alerta se não houver registro no dia anterior', async () => {
    mockDb.collection.mockImplementation((colName: string) => {
      if (colName === 'backups') {
        return {
          get: vi.fn().mockResolvedValue({ docs: [] })
        };
      }
      return {
        get: vi.fn().mockResolvedValue({ docs: [] }),
        add: vi.fn().mockResolvedValue({ id: 'doc-1' }),
        doc: () => ({
          get: vi.fn().mockResolvedValue({ exists: false })
        })
      };
    });

    const result = await processMissingBackupCheck(mockDb, refDate, {
      activeChannel: 'none',
      emails: [],
      webhookUrls: [],
      missingBackupCheckTime: '08:00',
      complianceThreshold: 80
    });

    expect(result.missing).toBe(true);
    expect(result.alerted).toBe(true);
    expect(result.recordCount).toBe(0);
  });

  it('processMissingBackupCheck não deve disparar alerta se houver registro no dia anterior', async () => {
    const yesterday = new Date(refDate);
    yesterday.setDate(refDate.getDate() - 1);

    mockDb.collection.mockImplementation((colName: string) => {
      if (colName === 'backups') {
        return {
          get: vi.fn().mockResolvedValue({
            docs: [
              { id: 'bk-1', data: () => ({ timestamp: yesterday.toISOString(), status: 'success' }) }
            ]
          })
        };
      }
      return {
        add: vi.fn().mockResolvedValue({ id: 'doc-1' }),
        doc: () => ({
          get: vi.fn().mockResolvedValue({ exists: false })
        })
      };
    });

    const result = await processMissingBackupCheck(mockDb, refDate, {
      activeChannel: 'none',
      emails: [],
      webhookUrls: [],
      missingBackupCheckTime: '08:00',
      complianceThreshold: 80
    });

    expect(result.missing).toBe(false);
    expect(result.alerted).toBe(false);
    expect(result.recordCount).toBe(1);
  });

  it('processBackupFailureAlert deve acionar alerta se status for failed ou warning', async () => {
    const failureTriggered = await processBackupFailureAlert(
      mockDb,
      'bk-failed-001',
      {
        client: 'Cliente Beta',
        status: 'failed',
        title: 'Backup SQL Server',
        timestamp: new Date().toISOString(),
        technicalAnalysis: 'Sem espaço em disco no storage S3'
      },
      {
        activeChannel: 'none',
        emails: [],
        webhookUrls: [],
        missingBackupCheckTime: '08:00',
        complianceThreshold: 80
      }
    );

    expect(failureTriggered).toBe(true);
  });

  it('processBackupFailureAlert não deve acionar alerta para backups bem-sucedidos', async () => {
    const failureTriggered = await processBackupFailureAlert(
      mockDb,
      'bk-success-001',
      {
        client: 'Cliente Beta',
        status: 'success',
        title: 'Backup SQL Server',
        timestamp: new Date().toISOString()
      },
      {
        activeChannel: 'none',
        emails: [],
        webhookUrls: [],
        missingBackupCheckTime: '08:00',
        complianceThreshold: 80
      }
    );

    expect(failureTriggered).toBe(false);
  });

  it('processWeeklyComplianceReport deve disparar alerta se conformidade for menor que threshold', async () => {
    // 0 backups em 7 dias -> 0% conformidade < 80%
    mockDb.collection.mockImplementation((colName: string) => {
      if (colName === 'backups') {
        return {
          get: vi.fn().mockResolvedValue({ docs: [] })
        };
      }
      return {
        add: vi.fn().mockResolvedValue({ id: 'doc-1' }),
        doc: () => ({ get: vi.fn().mockResolvedValue({ exists: false }) })
      };
    });

    const result = await processWeeklyComplianceReport(mockDb, refDate, {
      activeChannel: 'none',
      emails: [],
      webhookUrls: [],
      missingBackupCheckTime: '08:00',
      complianceThreshold: 80
    });

    expect(result.complianceRate).toBe(0);
    expect(result.alerted).toBe(true);
  });
});
