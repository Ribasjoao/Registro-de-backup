import { describe, it, expect } from 'vitest';
import { heuristicParsePdf, extractTextFromPdfBase64 } from '../../lib/pdfLocalExtractor';

describe('PDF Local Extractor & Heuristic Parser', () => {
  it('deve extrair nome do cliente conhecido a partir do texto ou nome do arquivo', () => {
    const knownClients = ['Hospital São Lucas', 'Laboratório Bioclin', 'Supermercado Nova Era'];
    const result = heuristicParsePdf(
      'Backup Veeam report for Hospital Sao Lucas server DC01',
      'report.pdf',
      knownClients
    );

    expect(result.clientName).toBe('Hospital São Lucas');
  });

  it('deve extrair nome do cliente a partir do nome do arquivo quando não estiver no texto', () => {
    const knownClients = ['Hospital São Lucas', 'Laboratório Bioclin'];
    const result = heuristicParsePdf(
      'Simple backup completed without client mentioned in body',
      'Backup_Laboratorio_Bioclin_Diario.pdf',
      knownClients
    );

    expect(result.clientName).toBe('Laboratório Bioclin');
  });

  it('deve detectar status failed e identificar causa raiz de VSS snapshot', () => {
    const text = `
      Job: Backup-SRV-AD
      Status: Failed
      Error: VSS snapshot creation failed on volume C: (0x80042306)
      Duration: 00:04:12
    `;
    const result = heuristicParsePdf(text, 'backup_ad.pdf');

    expect(result.overallStatus).toBe('failed');
    expect(result.jobs.length).toBeGreaterThan(0);
    const failedJob = result.jobs.find(j => j.status === 'failed');
    expect(failedJob).toBeDefined();
    expect(failedJob?.rootCause).toBe('service');
    expect(failedJob?.actionPlan).toContain('VSS');
  });

  it('deve detectar status failed com causa storage em erro de disco cheio', () => {
    const text = `
      Job: FileServer-Full
      Result: Error
      Description: There is not enough space on the disk. Error code: 0x80070070.
    `;
    const result = heuristicParsePdf(text, 'fs.pdf');

    expect(result.overallStatus).toBe('failed');
    const job = result.jobs[0];
    expect(job.rootCause).toBe('storage');
    expect(job.actionPlan).toContain('espaço');
  });

  it('deve identificar status success quando todos os jobs tiverem sucesso', () => {
    const text = `
      Job: Backup-DB-Prod
      Status: Success
      Bytes transferred: 120 GB
      Duration: 00:15:30
    `;
    const result = heuristicParsePdf(text, 'db_prod.pdf');

    expect(result.overallStatus).toBe('success');
    expect(result.jobs[0].status).toBe('success');
  });

  it('deve extrair texto de buffer com comandos BT/ET do PDF', () => {
    const sampleStream = 'BT /F1 12 Tf (Relatorio Mensal de Backup) Tj ET';
    const base64 = Buffer.from(sampleStream, 'utf-8').toString('base64');
    const text = extractTextFromPdfBase64(base64, 'sample.pdf');

    expect(text).toContain('Relatorio Mensal de Backup');
  });
});
