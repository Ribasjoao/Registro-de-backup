import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseBackupPdf } from '../../services/geminiService';

// Mock auth from firebase
vi.mock('../../firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('fake-firebase-jwt-token-123'),
      email: 'tech@gate7.com'
    }
  },
  functions: {},
  httpsCallable: vi.fn()
}));

describe('Gemini Service - Leitura e Diagnóstico de PDF', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve enviar o arquivo PDF via base64 com Bearer Token e retornar os jobs diagnosticados', async () => {
    const mockReportData = {
      clientName: 'Hospital São Lucas',
      backupDate: '2026-09-08T03:00:00.000Z',
      overallStatus: 'warning',
      summary: 'Backup concluído com 1 job em falha por falta de espaço em disco.',
      jobs: [
        {
          title: 'Backup VM-DC01',
          backupType: 'LOCAL',
          status: 'success',
        },
        {
          title: 'Backup FileServer Diário',
          backupType: 'CLOUD',
          status: 'failed',
          technicalAnalysis: 'Erro 0x80070070: Espaço insuficiente em disco no repositório.',
          actionPlan: 'Executar limpeza de retenção ou expandir LUN no storage.',
          criticality: 'high',
          rootCause: 'storage',
          impact: 'high',
        }
      ]
    };

    // Mock global fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockReportData
      })
    } as any);

    const dummyBlob = new Blob(['%PDF-1.4 fake pdf content'], { type: 'application/pdf' });
    const dummyFile = new File([dummyBlob], 'relatorio_veeam_hospital.pdf', { type: 'application/pdf' });

    const result = await parseBackupPdf(dummyFile, ['Hospital São Lucas', 'Clinica Alfa']);

    expect(global.fetch).toHaveBeenCalledWith('/api/ai/parse-backup-pdf', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Authorization': 'Bearer fake-firebase-jwt-token-123'
      })
    }));

    expect(result.clientName).toBe('Hospital São Lucas');
    expect(result.overallStatus).toBe('warning');
    expect(result.jobs).toHaveLength(2);
    expect(result.jobs[1].status).toBe('failed');
    expect(result.jobs[1].technicalAnalysis).toContain('0x80070070');
  });

  it('deve lançar erro amigável se a resposta do servidor retornar erro 500', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        error: 'Erro na análise do PDF com IA'
      })
    } as any);

    const dummyBlob = new Blob(['%PDF-1.4 fake'], { type: 'application/pdf' });
    const dummyFile = new File([dummyBlob], 'teste.pdf', { type: 'application/pdf' });

    await expect(parseBackupPdf(dummyFile)).rejects.toThrow('Erro na análise do PDF com IA');
  });
});
