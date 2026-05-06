import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CertTable from './CertTable';
import type { Cert } from '../../types';

// ─── Mocks ───────────────────────────────────────────────────────────────────
// vi.mock is hoisted — variables used inside factories must be declared with vi.hoisted()
const { mockNavigate, mockApiGet, mockZipFile, mockZipGenerate } = vi.hoisted(() => ({
  mockNavigate:    vi.fn(),
  mockApiGet:      vi.fn(),
  mockZipFile:     vi.fn(),
  mockZipGenerate: vi.fn().mockResolvedValue(new Blob(['zip'])),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
vi.mock('@certstar/shared', () => ({ certTypeMap: { WTOP: '水处理操作员' } }));
vi.mock('../../services/api', () => ({ default: { get: mockApiGet } }));
vi.mock('jszip', () => ({
  // Vitest 4+ requires a regular function (not arrow) when mock is called with `new`
  default: vi.fn(function () { return { file: mockZipFile, generateAsync: mockZipGenerate }; }),
}));

// Mock URL.createObjectURL / revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// ─── Fixtures ────────────────────────────────────────────────────────────────
const makeCert = (overrides: Partial<Cert> = {}): Cert => ({
  id: 'cert-1',
  name: '张三',
  idNum: '110101199001011234',
  certNum: 'WP2024001',
  certType: 'WTOP',
  expDate: '2026-12-31T00:00:00.000Z',
  organization: '北京水务',
  issuingAgency: '北京市',
  certImageUrl: 'cert-image/cert-1.png',
  profileImageUrl: 'profile-image/cert-1.jpg',
  createdAt: '2024-01-01T08:00:00.000Z',
  updatedAt: '2024-06-01T08:00:00.000Z',
  ...overrides,
});

const CERTS: Cert[] = [
  makeCert({ id: 'cert-1', name: '张三', certNum: 'WP001' }),
  makeCert({ id: 'cert-2', name: '李四', certNum: 'WP002' }),
  makeCert({ id: 'cert-3', name: '王五', certNum: 'WP003' }),
];

const renderTable = (certs = CERTS, onBatchDelete = vi.fn()) =>
  render(<CertTable certs={certs} onBatchDelete={onBatchDelete} />);

// ─── Selection ────────────────────────────────────────────────────────────────
describe('Selection', () => {
  it('renders checkboxes for each row', () => {
    renderTable();
    // header checkbox + 3 row checkboxes
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
  });

  it('clicking a row toggles its selection', async () => {
    renderTable();
    const rows = screen.getAllByRole('row').slice(1); // skip header
    await userEvent.click(rows[0]);
    expect(screen.getByText('已选 1 条')).toBeInTheDocument();
    await userEvent.click(rows[0]);
    expect(screen.queryByText(/已选/)).not.toBeInTheDocument();
  });

  it('header checkbox selects all filtered items', async () => {
    renderTable();
    const [headerCheckbox] = screen.getAllByRole('checkbox');
    await userEvent.click(headerCheckbox);
    expect(screen.getByText('已选 3 条')).toBeInTheDocument();
  });

  it('header checkbox when all selected → deselects all globally', async () => {
    renderTable();
    const [headerCheckbox] = screen.getAllByRole('checkbox');
    await userEvent.click(headerCheckbox); // select all
    await userEvent.click(headerCheckbox); // deselect all
    expect(screen.queryByText(/已选/)).not.toBeInTheDocument();
  });

  it('clicking header checkbox in partial selection state selects all filtered', async () => {
    renderTable();
    const rows = screen.getAllByRole('row').slice(1);
    await userEvent.click(rows[0]); // select first row only (partial/indeterminate state)
    const [headerCheckbox] = screen.getAllByRole('checkbox');
    await userEvent.click(headerCheckbox); // should select ALL filtered
    expect(screen.getByText('已选 3 条')).toBeInTheDocument();
  });

  it('selecting filtered items does not deselect items outside filter', async () => {
    renderTable();
    // select cert-1 manually
    const rows = screen.getAllByRole('row').slice(1);
    await userEvent.click(rows[0]);

    // filter to show only cert-2
    const search = screen.getByPlaceholderText('搜索...');
    await userEvent.type(search, '李四');

    // select all filtered (cert-2)
    const [headerCheckbox] = screen.getAllByRole('checkbox');
    await userEvent.click(headerCheckbox);

    // clear filter — both cert-1 and cert-2 should be selected
    await userEvent.clear(search);
    expect(screen.getByText('已选 2 条')).toBeInTheDocument();
  });

  it('deselect-all clears selections outside current filter', async () => {
    renderTable();
    // select cert-1
    const rows = screen.getAllByRole('row').slice(1);
    await userEvent.click(rows[0]);

    // filter to show only cert-2, select it too
    const search = screen.getByPlaceholderText('搜索...');
    await userEvent.type(search, '李四');
    const [headerCheckbox] = screen.getAllByRole('checkbox');
    await userEvent.click(headerCheckbox); // now cert-1 and cert-2 selected

    // while filtered, click header checkbox again → deselect all globally
    await userEvent.click(headerCheckbox);

    // clear filter — nothing should be selected
    await userEvent.clear(search);
    expect(screen.queryByText(/已选/)).not.toBeInTheDocument();
  });
});

// ─── Batch delete ─────────────────────────────────────────────────────────────
describe('Batch delete', () => {
  it('delete button not visible when nothing selected', () => {
    renderTable();
    expect(screen.queryByRole('button', { name: /删除/ })).not.toBeInTheDocument();
  });

  it('delete button appears when items are selected', async () => {
    renderTable();
    await userEvent.click(screen.getAllByRole('row')[1]);
    expect(screen.getByRole('button', { name: /删除/ })).toBeInTheDocument();
  });

  it('clicking delete opens confirmation dialog with correct count', async () => {
    renderTable();
    const [headerCheckbox] = screen.getAllByRole('checkbox');
    await userEvent.click(headerCheckbox);
    await userEvent.click(screen.getByRole('button', { name: /删除/ }));
    expect(screen.getByText(/确定要删除选中的 3 条证书/)).toBeInTheDocument();
  });

  it('confirming delete calls onBatchDelete with selected ids', async () => {
    const onBatchDelete = vi.fn().mockResolvedValue(undefined);
    renderTable(CERTS, onBatchDelete);

    const [headerCheckbox] = screen.getAllByRole('checkbox');
    await userEvent.click(headerCheckbox);
    await userEvent.click(screen.getByRole('button', { name: /删除/ }));
    await userEvent.click(screen.getByRole('button', { name: '删除' })); // dialog confirm

    expect(onBatchDelete).toHaveBeenCalledWith(['cert-1', 'cert-2', 'cert-3']);
  });

  it('cancelling dialog does not call onBatchDelete', async () => {
    const onBatchDelete = vi.fn();
    renderTable(CERTS, onBatchDelete);

    await userEvent.click(screen.getAllByRole('row')[1]);
    await userEvent.click(screen.getByRole('button', { name: /删除/ }));
    await userEvent.click(screen.getByRole('button', { name: '取消' }));

    expect(onBatchDelete).not.toHaveBeenCalled();
  });

  it('clears selection after successful delete', async () => {
    const onBatchDelete = vi.fn().mockResolvedValue(undefined);
    renderTable(CERTS, onBatchDelete);

    const [headerCheckbox] = screen.getAllByRole('checkbox');
    await userEvent.click(headerCheckbox);
    await userEvent.click(screen.getByRole('button', { name: /删除/ }));
    await userEvent.click(screen.getByRole('button', { name: '删除' }));

    await waitFor(() => expect(screen.queryByText(/已选/)).not.toBeInTheDocument());
  });

  it('only deletes selected ids, not all certs', async () => {
    const onBatchDelete = vi.fn().mockResolvedValue(undefined);
    renderTable(CERTS, onBatchDelete);

    // select only first row
    await userEvent.click(screen.getAllByRole('row')[1]);
    await userEvent.click(screen.getByRole('button', { name: /删除/ }));
    await userEvent.click(screen.getByRole('button', { name: '删除' }));

    expect(onBatchDelete).toHaveBeenCalledWith(['cert-1']);
    expect(onBatchDelete).not.toHaveBeenCalledWith(expect.arrayContaining(['cert-2', 'cert-3']));
  });
});

// ─── Batch download ZIP ───────────────────────────────────────────────────────
describe('Batch download ZIP', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockZipFile.mockReset();
    mockZipGenerate.mockReset();
    mockCreateObjectURL.mockReset();
    mockRevokeObjectURL.mockReset();
    mockApiGet.mockResolvedValue({ data: new Blob(['image']) });
    mockZipGenerate.mockResolvedValue(new Blob(['zip']));
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
  });

  it('download button not visible when nothing selected', () => {
    renderTable();
    expect(screen.queryByRole('button', { name: /下载/ })).not.toBeInTheDocument();
  });

  it('download button appears when items are selected', async () => {
    renderTable();
    await userEvent.click(screen.getAllByRole('row')[1]);
    expect(screen.getByRole('button', { name: /下载 ZIP/ })).toBeInTheDocument();
  });

  it('fetches proxy-image for each selected cert with certImageUrl', async () => {
    renderTable();
    const [headerCheckbox] = screen.getAllByRole('checkbox');
    await userEvent.click(headerCheckbox);
    await userEvent.click(screen.getByRole('button', { name: /下载 ZIP/ }));

    await waitFor(() =>
      expect(mockApiGet).toHaveBeenCalledWith('/sts/proxy-image', {
        params: { key: 'cert-image/cert-1.png' },
        responseType: 'blob',
      })
    );
    expect(mockApiGet).toHaveBeenCalledTimes(3);
  });

  it('skips certs without certImageUrl', async () => {
    const certs = [
      makeCert({ id: 'cert-1', certImageUrl: 'cert-image/cert-1.png' }),
      makeCert({ id: 'cert-2', certImageUrl: undefined }),
    ];
    renderTable(certs);
    const [headerCheckbox] = screen.getAllByRole('checkbox');
    await userEvent.click(headerCheckbox);
    await userEvent.click(screen.getByRole('button', { name: /下载 ZIP/ }));

    await waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(1));
    expect(mockApiGet).toHaveBeenCalledWith('/sts/proxy-image', {
      params: { key: 'cert-image/cert-1.png' },
      responseType: 'blob',
    });
  });

  it('names ZIP files by certNum', async () => {
    renderTable([makeCert({ id: 'cert-1', certNum: 'WP001', certImageUrl: 'cert-image/cert-1.png' })]);
    await userEvent.click(screen.getAllByRole('row')[1]);
    await userEvent.click(screen.getByRole('button', { name: /下载 ZIP/ }));

    await waitFor(() => expect(mockZipFile).toHaveBeenCalledWith('WP001.png', expect.anything()));
  });

  it('falls back to cert id when certNum is missing', async () => {
    renderTable([makeCert({ id: 'cert-1', certNum: undefined, certImageUrl: 'cert-image/cert-1.png' })]);
    await userEvent.click(screen.getAllByRole('row')[1]);
    await userEvent.click(screen.getByRole('button', { name: /下载 ZIP/ }));

    await waitFor(() => expect(mockZipFile).toHaveBeenCalledWith('cert-1.png', expect.anything()));
  });

  it('triggers browser download with correct filename', async () => {
    renderTable([makeCert()]);
    await userEvent.click(screen.getAllByRole('row')[1]);

    // Install spies after initial render so React mounting calls don't pollute the spy
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    await userEvent.click(screen.getByRole('button', { name: /下载 ZIP/ }));

    await waitFor(() => expect(appendSpy).toHaveBeenCalled());
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe('certificates.zip');
    expect(removeSpy).toHaveBeenCalled();
  });
});

// ─── Empty state ──────────────────────────────────────────────────────────────
describe('Empty state', () => {
  it('shows empty message when certs array is empty', () => {
    renderTable([]);
    expect(screen.getByText('暂无证书数据')).toBeInTheDocument();
  });
});
