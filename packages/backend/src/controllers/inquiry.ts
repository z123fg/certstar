import { Request, Response } from "express";
import { certTypeMap, toChineseDateString } from "@certstar/shared";
import logger from "../logger";
import prisma from "../lib/prisma";
import oss from "../lib/oss";

const isTodayOrLater = (expDate: Date): boolean => {
    const todayCN = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
    return toChineseDateString(expDate) >= todayCN;
};

export const searchByIdNum = async (req: Request, res: Response) => {
    const idNum = (req.query.idNum as string ?? "").trim();
    if (!idNum) {
        res.status(400).json({ message: "idNum is required" });
        return;
    }
    try {
        const certs = await prisma.cert.findMany({ where: { idNum } });
        const results = certs
            .filter((c) => isTodayOrLater(c.expDate))
            .map((c) => ({
                slug: `${c.idNum.slice(-4)}-${c.certNum}`,
                certType: certTypeMap[c.certType as keyof typeof certTypeMap] ?? c.certType,
                expDate: c.expDate,
            }));
        res.json({ results });
    } catch (err) {
        logger.error(err, "Failed to search certs by idNum");
        res.status(500).json({ message: "Search failed" });
    }
};

// Slug format: {last4ofIdNum}-{certNum}
export const getByCertSlug = async (req: Request, res: Response) => {
    const slug = req.params.slug as string;
    if (!slug || slug.length < 6) {
        res.status(400).json({ message: "Invalid slug" });
        return;
    }
    const last4 = slug.slice(0, 4);
    const certNum = slug.slice(5);
    if (!certNum) {
        res.status(400).json({ message: "Invalid slug" });
        return;
    }

    try {
        const cert = await prisma.cert.findUnique({ where: { certNum } });
        if (!cert || !cert.idNum.endsWith(last4)) {
            res.status(404).json({ message: "Certificate not found" });
            return;
        }
        if (!isTodayOrLater(cert.expDate)) {
            res.status(410).json({ message: "Certificate has expired" });
            return;
        }

        const signedCertImageUrl = cert.certImageUrl
            ? oss.signatureUrl(cert.certImageUrl, { expires: 3600 })
            : null;
        const signedProfileImageUrl = cert.profileImageUrl
            ? oss.signatureUrl(cert.profileImageUrl, { expires: 3600 })
            : null;

        res.json({
            result: {
                ...cert,
                certImageUrl: signedCertImageUrl,
                profileImageUrl: signedProfileImageUrl,
            },
        });
    } catch (err) {
        logger.error(err, "Failed to fetch cert for inquiry");
        res.status(500).json({ message: "Failed to fetch certificate" });
    }
};
