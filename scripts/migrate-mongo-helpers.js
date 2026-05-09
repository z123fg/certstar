/**
 * Pure helper functions for the MongoDB → PostgreSQL migration.
 * Exported separately so they can be unit tested without running the CLI.
 */

/**
 * Extract the text content from a MongoDB sprite field.
 */
export function text(field) {
    return field?.content?.trim() ?? null;
}

/**
 * Parse position values (stored as strings in MongoDB) to floats.
 */
export function position(field) {
    if (!field) return { left: null, top: null, scaleX: null, scaleY: null, angle: null };
    const p = (v) => {
        const n = parseFloat(v);
        return isNaN(n) ? null : n;
    };
    return {
        left: p(field.left),
        top: p(field.top),
        scaleX: p(field.scaleX),
        scaleY: p(field.scaleY),
        angle: p(field.angle),
    };
}

/**
 * Parse expDate string "2025/06/30" or "2025-06-30" to a JS Date.
 */
export function parseExpDate(raw) {
    if (!raw) return null;
    const normalised = raw.replace(/\//g, "-");
    const d = new Date(normalised);
    return isNaN(d.getTime()) ? null : d;
}

const OLD_CERT_URL_PREFIX = "https://www.cert-inquiry.cn/cert/";
const OSS_CERT_IMAGE_PREFIX = "https://qrcode-portal.oss-cn-hangzhou.aliyuncs.com/cert-image/";

/**
 * Extract cert image URL from the old certImage field.
 * Old content was a webpage URL like https://www.cert-inquiry.cn/cert/0611-JX-Ⅱ-2022001.
 * We extract the slug and compose the real OSS URL.
 */
export function extractCertImageUrl(certImageField) {
    const content = certImageField?.content?.trim();
    if (!content) return null;
    if (content.startsWith(OLD_CERT_URL_PREFIX)) {
        const slug = content.slice(OLD_CERT_URL_PREFIX.length);
        return slug ? `${OSS_CERT_IMAGE_PREFIX}${slug}.png` : null;
    }
    // Already an OSS URL — use as-is
    if (content.startsWith("https://")) return content;
    return null;
}

/**
 * Map a raw MongoDB document to a Prisma Cert create input.
 */
export function mapDoc(doc) {
    const warnings = [];

    const name = text(doc.name);
    const idNum = text(doc.idNum);
    const organization = text(doc.organization);
    const certNum = text(doc.certNum);
    const certType = text(doc.certType);
    const issuingAgency = text(doc.issuingAgency);
    const expDateRaw = text(doc.expDate);
    const expDate = parseExpDate(expDateRaw);
    const profileImageUrl = text(doc.profileImage) || null;
    const certImageUrl = extractCertImageUrl(doc.certImage);

    if (!name) warnings.push("missing name");
    if (!idNum) warnings.push("missing idNum");
    if (!organization) warnings.push("missing organization");
    if (!certNum) warnings.push("missing certNum");
    if (!certType) warnings.push("missing certType");
    if (!issuingAgency) warnings.push("missing issuingAgency");
    if (!expDate) warnings.push(`unparseable expDate: "${expDateRaw}"`);

    if (profileImageUrl?.includes("profile-photo/")) {
        warnings.push(`profileImageUrl uses old prefix "profile-photo/" — backend proxy validation may reject it`);
    }

    const namePos = position(doc.name);
    const idNumPos = position(doc.idNum);
    const orgPos = position(doc.organization);
    const certNumPos = position(doc.certNum);
    const expDatePos = position(doc.expDate);
    const profilePos = position(doc.profileImage);

    const data = {
        name, idNum, organization, certNum, certType, issuingAgency,
        expDate, certImageUrl, profileImageUrl,

        nameLeft: namePos.left, nameTop: namePos.top,
        nameScaleX: namePos.scaleX, nameScaleY: namePos.scaleY, nameAngle: namePos.angle,

        idNumLeft: idNumPos.left, idNumTop: idNumPos.top,
        idNumScaleX: idNumPos.scaleX, idNumScaleY: idNumPos.scaleY, idNumAngle: idNumPos.angle,

        organizationLeft: orgPos.left, organizationTop: orgPos.top,
        organizationScaleX: orgPos.scaleX, organizationScaleY: orgPos.scaleY, organizationAngle: orgPos.angle,

        certNumLeft: certNumPos.left, certNumTop: certNumPos.top,
        certNumScaleX: certNumPos.scaleX, certNumScaleY: certNumPos.scaleY, certNumAngle: certNumPos.angle,

        expDateLeft: expDatePos.left, expDateTop: expDatePos.top,
        expDateScaleX: expDatePos.scaleX, expDateScaleY: expDatePos.scaleY, expDateAngle: expDatePos.angle,

        profileLeft: profilePos.left, profileTop: profilePos.top,
        profileScaleX: profilePos.scaleX, profileScaleY: profilePos.scaleY, profileAngle: profilePos.angle,
    };

    return { data, warnings };
}
