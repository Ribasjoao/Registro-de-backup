import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegisterBackupModal } from '../../components/RegisterBackupModal';
import { RecordsView } from '../../components/RecordsView';
import { DashboardView } from '../../components/DashboardView';
import { BackupRecord } from '../../types';

// Mock Recharts to avoid DOM measurement issues in test environment
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="recharts-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  CartesianGrid: () => <div />,
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual: any = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('3.3 Componentes Críticos - RegisterBackupModal (Formulário de Registro)', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não deve renderizar nada quando isOpen for falso', () => {
    const { container } = render(
      <RegisterBackupModal
        isOpen={false}
        onClose={mockOnClose}
        clients={[]}
        backups={[]}
        backupTypes={[]}
        onSave={mockOnSave}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('deve exibir mensagem de erro ao tentar salvar sem cliente', async () => {
    render(
      <RegisterBackupModal
        isOpen={true}
        onClose={mockOnClose}
        clients={[]}
        backups={[]}
        backupTypes={[]}
        onSave={mockOnSave}
      />
    );

    const submitButton = screen.getByText(/Concluir Registro|Salvar/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/A identificação do Cliente é obrigatória/i)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('deve chamar onSave com dados válidos ao preencher cliente e job', async () => {
    render(
      <RegisterBackupModal
        isOpen={true}
        onClose={mockOnClose}
        clients={[]}
        backups={[]}
        backupTypes={[]}
        onSave={mockOnSave}
      />
    );

    // Enter custom client name in input field
    const clientInput = screen.getByPlaceholderText(/Nome do cliente/i);
    fireEvent.change(clientInput, { target: { value: 'Cliente Alfa' } });

    // Add job button
    const addJobButton = screen.getByText(/\+ Adicionar Job/i);
    fireEvent.click(addJobButton);

    // Fill job title
    const jobTitleInputs = screen.getAllByPlaceholderText(/Nome do job/i);
    fireEvent.change(jobTitleInputs[0], { target: { value: 'Veeam Backup Daily' } });

    // Click submit
    const submitButton = screen.getByText(/Concluir Registro/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            client: 'Cliente Alfa',
            title: 'Veeam Backup Daily',
            status: 'success',
          }),
        ])
      );
    });

    expect(mockOnClose).toHaveBeenCalled();
  });
});

describe('3.3 Componentes Críticos - RecordsView (Lista de Registros de Backup)', () => {
  const sampleBackups: BackupRecord[] = [
    {
      id: 'bk-1',
      client: 'Cliente Alfa',
      title: 'Backup Servidor SQL',
      status: 'success',
      category: 'Rotina',
      timestamp: new Date().toISOString(),
      responsible: 'João Santos',
      backupType: 'LOCAL',
    },
    {
      id: 'bk-2',
      client: 'Cliente Beta',
      title: 'Backup VM Domain Controller',
      status: 'failed',
      category: 'Incidente',
      timestamp: new Date().toISOString(),
      responsible: 'Maria Lima',
      technicalAnalysis: 'Disco sem espaço',
      backupType: 'CLOUD',
    },
  ];

  it('deve exibir mensagem de estado vazio quando não existirem backups', () => {
    render(
      <MemoryRouter>
        <RecordsView backups={[]} isLoading={false} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Histórico Vazio: Sem Auditorias Cadastradas/i)).toBeInTheDocument();
  });

  it('deve renderizar a lista de registros de backups recebidos', () => {
    render(
      <MemoryRouter>
        <RecordsView backups={sampleBackups} isLoading={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('Cliente Alfa')).toBeInTheDocument();
    expect(screen.getByText('Backup Servidor SQL')).toBeInTheDocument();
    expect(screen.getByText('Cliente Beta')).toBeInTheDocument();
    expect(screen.getByText('Backup VM Domain Controller')).toBeInTheDocument();
  });

  it('deve filtrar registros pelo termo digitado no campo de busca', () => {
    render(
      <MemoryRouter>
        <RecordsView backups={sampleBackups} isLoading={false} />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Pesquisar/i);
    fireEvent.change(searchInput, { target: { value: 'Beta' } });

    expect(screen.queryByText('Cliente Alfa')).not.toBeInTheDocument();
    expect(screen.getByText('Cliente Beta')).toBeInTheDocument();
  });
});

describe('3.3 Componentes Críticos - DashboardView (Dashboard de Conformidade)', () => {
  const nowISO = new Date().toISOString();
  const mockBackups: BackupRecord[] = [
    {
      id: 'bk-1',
      client: 'Cliente Alfa',
      title: 'Job 1',
      status: 'success',
      category: 'Rotina',
      timestamp: nowISO,
      responsible: 'João Santos',
    },
    {
      id: 'bk-2',
      client: 'Cliente Alfa',
      title: 'Job 2',
      status: 'success',
      category: 'Rotina',
      timestamp: nowISO,
      responsible: 'João Santos',
    },
    {
      id: 'bk-3',
      client: 'Cliente Beta',
      title: 'Job 3',
      status: 'failed',
      category: 'Incidente',
      timestamp: nowISO,
      responsible: 'João Santos',
      technicalAnalysis: 'Falha de rede',
    },
  ];

  it('deve exibir o estado vazio quando a lista de backups estiver vazia', () => {
    render(
      <MemoryRouter>
        <DashboardView backups={[]} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Status da Infraestrutura: Nenhum Backup Registrado/i)).toBeInTheDocument();
  });

  it('deve calcular e exibir a taxa de conformidade/sucesso e métricas dos backups', () => {
    render(
      <MemoryRouter>
        <DashboardView backups={mockBackups} />
      </MemoryRouter>
    );

    // 2 successes out of 3 = 67% (rendered in KPICard & Donut chart center)
    const rateElements = screen.getAllByText('67%');
    expect(rateElements.length).toBeGreaterThan(0);

    const totalElements = screen.getAllByText('3');
    expect(totalElements.length).toBeGreaterThan(0);
  });
});
