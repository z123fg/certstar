import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getAll = async (_req: Request, res: Response) => {
  try {
    const certs = await prisma.cert.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ result: certs });
  } catch {
    res.status(500).json({ message: "Failed to fetch certs" });
  }
};

export const createOne = async (req: Request, res: Response) => {
  try {
    const cert = await prisma.cert.create({
      data: { ...req.body, expDate: new Date(req.body.expDate) },
    });
    res.status(201).json({ result: cert });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const createMany = async (req: Request, res: Response) => {
  try {
    const items: any[] = req.body;
    const certs = await prisma.$transaction(
      items.map((data) =>
        prisma.cert.create({ data: { ...data, expDate: new Date(data.expDate) } })
      )
    );
    res.status(201).json({ result: certs });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getOne = async (req: Request, res: Response) => {
  try {
    const cert = await prisma.cert.findUnique({ where: { id: String(req.params.id) } });
    if (!cert) { res.status(404).json({ message: "Not found" }); return; }
    res.json({ result: cert });
  } catch {
    res.status(500).json({ message: "Failed to fetch cert" });
  }
};

export const updateOne = async (req: Request, res: Response) => {
  try {
    const cert = await prisma.cert.update({
      where: { id: String(req.params.id) },
      data: { ...req.body, expDate: req.body.expDate ? new Date(req.body.expDate) : undefined },
    });
    res.json({ result: cert });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteOne = async (req: Request, res: Response) => {
  try {
    await prisma.cert.delete({ where: { id: String(req.params.id) } });
    res.json({ message: "Deleted" });
  } catch {
    res.status(404).json({ message: "Not found" });
  }
};
