import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatRelativeTime } from '../../components/TimelineView';
import { getLevelForXP, awardXP, LEVEL_RANGES } from '../../lib/xpService';
import { mockFirestoreFunctions } from '../mocks/firebaseMock';

// Mock firebase module for xpService tests
vi.mock('../../firebase', () => ({
  db: {},
  doc: (...args: any[]) => mockFirestoreFunctions.doc({}, args[1], args[2]),
  getDoc: (...args: any[]) => mockFirestoreFunctions.getDoc(...args),
  updateDoc: (...args: any[]) => mockFirestoreFunctions.updateDoc(...args),
  addDoc: (...args: any[]) => mockFirestoreFunctions.addDoc(...args),
  collection: (...args: any[]) => mockFirestoreFunctions.collection({}, args[1]),
  handleFirestoreError: vi.fn(),
  OperationType: { UPDATE: 'update' },
}));

describe('3.1 Funções Utilitárias - Formatação de Data', () => {
  it('deve retornar "agora mesmo" para datas com menos de 1 minuto', () => {
    const nowISO = new Date().toISOString();
    expect(formatRelativeTime(nowISO)).toBe('agora mesmo');
  });

  it('deve retornar "há X minutos" para datas recentes', () => {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinsAgo)).toBe('há 5 minutos');
    const oneMinAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString();
    expect(formatRelativeTime(oneMinAgo)).toBe('há 1 minuto');
  });

  it('deve retornar "há X horas" para datas de algumas horas atrás', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe('há 3 horas');
    const oneHourAgo = new Date(Date.now() - 1 * 3600 * 1000).toISOString();
    expect(formatRelativeTime(oneHourAgo)).toBe('há 1 hora');
  });

  it('deve retornar "ontem às HH:mm" para datas de 1 dia atrás', () => {
    const yesterday = new Date(Date.now() - 25 * 3600 * 1000);
    const result = formatRelativeTime(yesterday.toISOString());
    expect(result).toMatch(/^ontem às \d{2}:\d{2}$/);
  });

  it('deve retornar fallback "algum tempo atrás" para entradas inválidas', () => {
    expect(formatRelativeTime('data-invalida-xyz')).toBe('algum tempo atrás');
    expect(formatRelativeTime('')).toBe('algum tempo atrás');
  });
});

describe('3.1 Funções Utilitárias - Cálculos de XP e Níveis', () => {
  it('deve retornar o nível correto para cada faixa de XP (boundary cases)', () => {
    expect(getLevelForXP(0)).toBe('Operador de Snapshot L1');
    expect(getLevelForXP(99)).toBe('Operador de Snapshot L1');
    
    expect(getLevelForXP(100)).toBe('Analista de Retenção & Storage');
    expect(getLevelForXP(299)).toBe('Analista de Retenção & Storage');
    
    expect(getLevelForXP(300)).toBe('Engenheiro de Disaster Recovery');
    expect(getLevelForXP(599)).toBe('Engenheiro de Disaster Recovery');
    
    expect(getLevelForXP(600)).toBe('Arquiteto de Replicação (PBS / S3)');
    expect(getLevelForXP(999)).toBe('Arquiteto de Replicação (PBS / S3)');
    
    expect(getLevelForXP(1000)).toBe('SysAdmin Root');
    expect(getLevelForXP(5000)).toBe('SysAdmin Root');
  });

  it('não deve conceder XP se userId for nulo ou quantia for zero', async () => {
    await awardXP('', 50, 'Teste');
    expect(mockFirestoreFunctions.updateDoc).not.toHaveBeenCalled();

    await awardXP('user-1', 0, 'Teste');
    expect(mockFirestoreFunctions.updateDoc).not.toHaveBeenCalled();
  });

  it('deve atualizar o Firestore com novo XP e nível ao conceder XP', async () => {
    mockFirestoreFunctions.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ xp: 50, level: 'Operador de Snapshot L1' }),
    });

    await awardXP('user-123', 60, 'Conclusão de Auditoria');

    expect(mockFirestoreFunctions.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      {
        xp: 110,
        level: 'Analista de Retenção & Storage',
      }
    );

    expect(mockFirestoreFunctions.addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'user-123',
        amount: 60,
        reason: 'Conclusão de Auditoria',
      })
    );
  });

  it('garante que o XP não fique negativo em deduções altas', async () => {
    mockFirestoreFunctions.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ xp: 20, level: 'Operador de Snapshot L1' }),
    });

    await awardXP('user-123', -50, 'Penalidade de Incidente');

    expect(mockFirestoreFunctions.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      {
        xp: 0,
        level: 'Operador de Snapshot L1',
      }
    );
  });
});

describe('3.1 Funções Utilitárias - Validação de Campos de Backup', () => {
  function validateBackupPayload(client: string, jobs: Array<{ title: string; status: string; technicalAnalysis?: string }>) {
    if (!client || !client.trim()) {
      return { valid: false, error: 'A identificação do Cliente é obrigatória.' };
    }
    if (!jobs || jobs.length === 0) {
      return { valid: false, error: 'Adicione pelo menos um Job para auditoria.' };
    }
    for (let i = 0; i < jobs.length; i++) {
      if (!jobs[i].title || !jobs[i].title.trim()) {
        return { valid: false, error: `O Nome do Job #${i + 1} não pode estar vazio.` };
      }
      if ((jobs[i].status === 'failed' || jobs[i].status === 'warning') && (!jobs[i].technicalAnalysis || !jobs[i].technicalAnalysis.trim())) {
        return { valid: false, error: `Por favor, preencha a "Descrição da Ocorrência" para o job "${jobs[i].title}" com alerta/falha.` };
      }
    }
    return { valid: true };
  }

  it('deve rejeitar se cliente estiver ausente', () => {
    const res = validateBackupPayload('', [{ title: 'Job 1', status: 'success' }]);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Cliente');
  });

  it('deve rejeitar se lista de jobs estiver vazia', () => {
    const res = validateBackupPayload('Cliente Alfa', []);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('pelo menos um Job');
  });

  it('deve rejeitar se o título de algum job estiver vazio', () => {
    const res = validateBackupPayload('Cliente Alfa', [{ title: '   ', status: 'success' }]);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('não pode estar vazio');
  });

  it('deve exigir análise técnica quando o status for failed ou warning', () => {
    const res = validateBackupPayload('Cliente Alfa', [{ title: 'Veeam Backup', status: 'failed', technicalAnalysis: '' }]);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Descrição da Ocorrência');
  });

  it('deve aprovar payload válido de backup', () => {
    const res = validateBackupPayload('Cliente Alfa', [
      { title: 'Veeam VM-01', status: 'success' },
      { title: 'Database SQL', status: 'failed', technicalAnalysis: 'Falha no disco de destino' },
    ]);
    expect(res.valid).toBe(true);
    expect(res.error).toBeUndefined();
  });
});
