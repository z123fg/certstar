import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { parseExpDate } from "@certstar/shared";
import logger from "../logger";

const prisma = new PrismaClient();

/**
 * Parse and validate an expDate value from the request body.
 * Returns a Date representing midnight China time (Asia/Shanghai), or null if invalid.
 */
const parseExpDateToDb = (raw: unknown): Date | null => {
  const normalized = parseExpDate(raw);
  if (!normalized) return null;
  // Store as China midnight so the date doesn't shift when read back in Asia/Shanghai
  return new Date(`${normalized}T00:00:00+08:00`);
};

// Maps Prisma error codes to HTTP status + human-readable message
export const handlePrismaError = (err: any): { status: number; message: string } => {
  switch (err.code) {
    case "P2002":
      return { status: 409, message: `${err.meta?.target?.[0]} already exists` };
    case "P2025":
      return { status: 404, message: "Record not found" };
    case "P2003":
      return { status: 400, message: "Related record not found" };
    default:
      return { status: 400, message: err.message ?? "Unknown error" };
  }
};

export const getAll = async (_req: Request, res: Response) => {
  try {
    const certs = await prisma.cert.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ result: certs });
  } catch (err) {
    logger.error(err, "Failed to fetch certs");
    res.status(500).json({ message: "Failed to fetch certs" });
  }
};

export const getOne = async (req: Request, res: Response) => {
  try {
    const cert = await prisma.cert.findUnique({ where: { id: String(req.params.id) } });
    if (!cert) { res.status(404).json({ message: "Not found" }); return; }
    res.json({ result: cert });
  } catch (err) {
    logger.error(err, "Failed to fetch cert");
    res.status(500).json({ message: "Failed to fetch cert" });
  }
};

export const createOne = async (req: Request, res: Response) => {
  const expDate = parseExpDateToDb(req.body.expDate);
  if (!expDate) {
    res.status(400).json({ message: "expDate is invalid or missing (expected yyyy-MM-dd)" });
    return;
  }
  try {
    const cert = await prisma.cert.create({ data: { ...req.body, expDate } });
    logger.info({ certId: cert.id }, "Cert created");
    res.status(201).json({ result: cert });
  } catch (err: any) {
    logger.error(err, "Failed to create cert");
    const { status, message } = handlePrismaError(err);
    res.status(status).json({ message });
  }
};

export const createMany = async (req: Request, res: Response) => {
  const items: any[] = req.body;
  // Validate all expDates up front before touching the DB
  const invalidRows = items.reduce<number[]>((acc, data, i) => {
    if (!parseExpDateToDb(data.expDate)) acc.push(i + 1);
    return acc;
  }, []);
  if (invalidRows.length > 0) {
    res.status(400).json({ message: `Invalid expDate at row(s): ${invalidRows.join(", ")}` });
    return;
  }
  try {
    const certs = await prisma.$transaction(
      items.map((data) =>
        prisma.cert.create({ data: { ...data, expDate: parseExpDateToDb(data.expDate)! } })
      )
    );
    logger.info({ count: certs.length }, "Batch certs created");
    res.status(201).json({ result: certs });
  } catch (err: any) {
    logger.error(err, "Failed to batch create certs");
    const { status, message } = handlePrismaError(err);
    res.status(status).json({ message });
  }
};

export const updateOne = async (req: Request, res: Response) => {
  try {
    const cert = await prisma.cert.update({
      where: { id: String(req.params.id) },
      data: { ...req.body, expDate: req.body.expDate ? parseExpDateToDb(req.body.expDate) ?? undefined : undefined },
    });
    logger.info({ certId: cert.id }, "Cert updated");
    res.json({ result: cert });
  } catch (err: any) {
    logger.error(err, "Failed to update cert");
    const { status, message } = handlePrismaError(err);
    res.status(status).json({ message });
  }
};

export const deleteMany = async (req: Request, res: Response) => {
  const { ids }: { ids: string[] } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ message: "ids must be a non-empty array" });
    return;
  }
  try {
    const { count } = await prisma.cert.deleteMany({ where: { id: { in: ids } } });
    logger.info({ count }, "Batch certs deleted");
    res.json({ count });
  } catch (err: any) {
    logger.error(err, "Failed to batch delete certs");
    const { status, message } = handlePrismaError(err);
    res.status(status).json({ message });
  }
};

export const deleteOne = async (req: Request, res: Response) => {
  try {
    await prisma.cert.delete({ where: { id: String(req.params.id) } });
    logger.info({ certId: req.params.id }, "Cert deleted");
    res.json({ message: "Deleted" });
  } catch (err: any) {
    logger.error(err, "Failed to delete cert");
    const { status, message } = handlePrismaError(err);
    res.status(status).json({ message });
  }
};
