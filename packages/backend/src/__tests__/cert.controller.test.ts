import { Request, Response } from 'express';

// ─── Prisma mock (must be before controller import) ──────────────────────────
const mockDeleteMany = jest.fn();
const mockDelete     = jest.fn();
const mockFindMany   = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate     = jest.fn();
const mockUpdate     = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    cert: {
      deleteMany:  mockDeleteMany,
      delete:      mockDelete,
      findMany:    mockFindMany,
      findUnique:  mockFindUnique,
      create:      mockCreate,
      update:      mockUpdate,
    },
    $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
  })),
}));

import { deleteMany, deleteOne, handlePrismaError } from '../controllers/cert';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const makeReq = (overrides: Partial<Request> = {}): Request =>
  ({ body: {}, params: {}, query: {}, ...overrides } as unknown as Request);

const makeRes = (): { res: Response; status: jest.Mock; json: jest.Mock } => {
  const json   = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res    = { status, json } as unknown as Response;
  return { res, status, json };
};

// ─── handlePrismaError ────────────────────────────────────────────────────────
describe('handlePrismaError', () => {
  it('P2002 → 409 with field name in message', () => {
    const err = { code: 'P2002', meta: { target: ['certNum'] } };
    expect(handlePrismaError(err)).toEqual({ status: 409, message: 'certNum already exists' });
  });

  it('P2025 → 404 record not found', () => {
    const err = { code: 'P2025' };
    expect(handlePrismaError(err)).toEqual({ status: 404, message: 'Record not found' });
  });

  it('P2003 → 400 related record not found', () => {
    const err = { code: 'P2003' };
    expect(handlePrismaError(err)).toEqual({ status: 400, message: 'Related record not found' });
  });

  it('unknown code → 400 with err.message', () => {
    const err = { code: 'P9999', message: 'something went wrong' };
    expect(handlePrismaError(err)).toEqual({ status: 400, message: 'something went wrong' });
  });

  it('no message → falls back to "Unknown error"', () => {
    const err = { code: 'P9999' };
    expect(handlePrismaError(err)).toEqual({ status: 400, message: 'Unknown error' });
  });

  it('P2002 with multiple targets → uses first field', () => {
    const err = { code: 'P2002', meta: { target: ['idNum', 'certNum'] } };
    expect(handlePrismaError(err)).toEqual({ status: 409, message: 'idNum already exists' });
  });
});

// ─── deleteMany ───────────────────────────────────────────────────────────────
describe('deleteMany', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes records and returns count', async () => {
    mockDeleteMany.mockResolvedValue({ count: 3 });
    const req = makeReq({ body: { ids: ['id1', 'id2', 'id3'] } });
    const { res, json } = makeRes();

    await deleteMany(req, res);

    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ['id1', 'id2', 'id3'] } } });
    expect(json).toHaveBeenCalledWith({ count: 3 });
  });

  it('returns 400 when ids is an empty array', async () => {
    const req = makeReq({ body: { ids: [] } });
    const { res, status, json } = makeRes();

    await deleteMany(req, res);

    expect(mockDeleteMany).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ message: 'ids must be a non-empty array' });
  });

  it('returns 400 when ids is not an array', async () => {
    const req = makeReq({ body: { ids: 'id1' } });
    const { res, status, json } = makeRes();

    await deleteMany(req, res);

    expect(mockDeleteMany).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when ids is missing from body', async () => {
    const req = makeReq({ body: {} });
    const { res, status } = makeRes();

    await deleteMany(req, res);

    expect(mockDeleteMany).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(400);
  });

  it('handles P2025 (record not found) → 404', async () => {
    mockDeleteMany.mockRejectedValue({ code: 'P2025' });
    const req = makeReq({ body: { ids: ['nonexistent'] } });
    const { res, status, json } = makeRes();

    await deleteMany(req, res);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ message: 'Record not found' });
  });

  it('handles P2002 (unique constraint) → 409', async () => {
    mockDeleteMany.mockRejectedValue({ code: 'P2002', meta: { target: ['certNum'] } });
    const req = makeReq({ body: { ids: ['id1'] } });
    const { res, status, json } = makeRes();

    await deleteMany(req, res);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({ message: 'certNum already exists' });
  });

  it('handles unexpected error → 400 with message', async () => {
    mockDeleteMany.mockRejectedValue({ code: 'P9999', message: 'unexpected' });
    const req = makeReq({ body: { ids: ['id1'] } });
    const { res, status, json } = makeRes();

    await deleteMany(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ message: 'unexpected' });
  });

  it('deletes single item correctly', async () => {
    mockDeleteMany.mockResolvedValue({ count: 1 });
    const req = makeReq({ body: { ids: ['id1'] } });
    const { res, json } = makeRes();

    await deleteMany(req, res);

    expect(json).toHaveBeenCalledWith({ count: 1 });
  });
});

// ─── deleteOne ────────────────────────────────────────────────────────────────
describe('deleteOne', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes a cert and returns success message', async () => {
    mockDelete.mockResolvedValue({});
    const req = makeReq({ params: { id: 'abc' } });
    const { res, json } = makeRes();

    await deleteOne(req, res);

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'abc' } });
    expect(json).toHaveBeenCalledWith({ message: 'Deleted' });
  });

  it('returns 404 when cert does not exist (P2025)', async () => {
    mockDelete.mockRejectedValue({ code: 'P2025' });
    const req = makeReq({ params: { id: 'nonexistent' } });
    const { res, status, json } = makeRes();

    await deleteOne(req, res);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ message: 'Record not found' });
  });
});
