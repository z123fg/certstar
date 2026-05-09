/**
 * Unit tests for migrate-mongo helpers.
 * Run with: node --test scripts/migrate-mongo.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { text, position, parseExpDate, mapDoc, extractCertImageUrl } from "./migrate-mongo-helpers.js";

// ── Sample document from the real MongoDB export ──────────────────────────────

const SAMPLE_DOC = {
    "_id": { "$oid": "62be5f8140af98ea67882909" },
    "name": { "type": "text", "isSprite": true, "content": "鲍士坤", "left": "1175", "top": "1765", "scaleX": "1", "scaleY": "1", "angle": "0", "_id": { "$oid": "641bf502c1e447c247c42052" } },
    "idNum": { "type": "text", "isSprite": true, "content": "340402197709040611", "left": "957", "top": "1942", "scaleX": "1", "scaleY": "1", "angle": "0", "_id": { "$oid": "641bf502c1e447c247c42053" } },
    "organization": { "type": "text", "isSprite": true, "content": "安徽大华检测技术有限公司", "left": "957", "top": "2100", "scaleX": "0.8473392933163049", "scaleY": "1", "angle": "0", "_id": { "$oid": "641bf502c1e447c247c42054" } },
    "certNum": { "type": "text", "isSprite": true, "content": "JX-Ⅱ-2022001", "left": "1175", "top": "2265", "scaleX": "1", "scaleY": "1", "angle": "0", "_id": { "$oid": "641bf502c1e447c247c42055" } },
    "expDate": { "type": "text", "isSprite": true, "content": "2025/06/30", "left": "819", "top": "2435", "scaleX": "1", "scaleY": "1", "angle": "0", "_id": { "$oid": "641bf502c1e447c247c42056" } },
    "profileImage": { "type": "image", "isSprite": true, "content": "https://qrcode-portal.oss-cn-hangzhou.aliyuncs.com/profile-photo/JX-%E2%85%A1-2022001_0611.jpeg", "left": "1850", "top": "1940", "scaleX": "0.8951965065502182", "scaleY": "0.8951965065502182", "angle": "0", "_id": { "$oid": "641bf502c1e447c247c42057" } },
    "certType": { "type": "select", "isSprite": false, "content": "MTM", "_id": { "$oid": "62be5f8140af98ea67882910" } },
    "issuingAgency": { "type": "text", "isSprite": false, "content": "中国电机工程学会电站焊接专业委员会", "_id": { "$oid": "62be5f8140af98ea67882911" } },
    "createTime": { "type": "text", "isSprite": false, "content": "1656643457606", "_id": { "$oid": "62be5f8140af98ea67882912" } },
    "updateTime": { "type": "text", "isSprite": false, "content": "1679553794674", "_id": { "$oid": "641bf502c1e447c247c4205b" } },
    "certImage": { "type": "image", "isSprite": false, "content": "https://www.cert-inquiry.cn/cert/0611-JX-%E2%85%A1-2022001", "_id": { "$oid": "641bf502c1e447c247c4205c" } },
    "__v": 0,
};

// ── text() ────────────────────────────────────────────────────────────────────

describe("text()", () => {
    it("extracts content from a sprite field", () => {
        assert.equal(text(SAMPLE_DOC.name), "鲍士坤");
    });

    it("extracts content from a non-sprite field", () => {
        assert.equal(text(SAMPLE_DOC.certType), "MTM");
    });

    it("trims whitespace", () => {
        assert.equal(text({ content: "  hello  " }), "hello");
    });

    it("returns null for null field", () => {
        assert.equal(text(null), null);
    });

    it("returns null for undefined field", () => {
        assert.equal(text(undefined), null);
    });

    it("returns null for field with no content", () => {
        assert.equal(text({}), null);
    });
});

// ── position() ────────────────────────────────────────────────────────────────

describe("position()", () => {
    it("parses string position values to floats", () => {
        const pos = position(SAMPLE_DOC.name);
        assert.equal(pos.left, 1175);
        assert.equal(pos.top, 1765);
        assert.equal(pos.scaleX, 1);
        assert.equal(pos.scaleY, 1);
        assert.equal(pos.angle, 0);
    });

    it("parses decimal scaleX correctly", () => {
        const pos = position(SAMPLE_DOC.organization);
        assert.ok(Math.abs(pos.scaleX - 0.8473392933163049) < 1e-10);
    });

    it("parses profileImage position with decimal scale", () => {
        const pos = position(SAMPLE_DOC.profileImage);
        assert.equal(pos.left, 1850);
        assert.equal(pos.top, 1940);
        assert.ok(Math.abs(pos.scaleX - 0.8951965065502182) < 1e-10);
    });

    it("returns all nulls for null field", () => {
        const pos = position(null);
        assert.deepEqual(pos, { left: null, top: null, scaleX: null, scaleY: null, angle: null });
    });

    it("returns null for non-numeric position values", () => {
        const pos = position({ left: "abc", top: "", scaleX: null });
        assert.equal(pos.left, null);
        assert.equal(pos.top, null);
        assert.equal(pos.scaleX, null);
    });
});

// ── parseExpDate() ────────────────────────────────────────────────────────────

describe("parseExpDate()", () => {
    it("parses slash-separated date", () => {
        const d = parseExpDate("2025/06/30");
        assert.ok(d instanceof Date);
        assert.equal(d.getUTCFullYear(), 2025);
        assert.equal(d.getUTCMonth(), 5); // 0-indexed
        assert.equal(d.getUTCDate(), 30);
    });

    it("parses dash-separated date", () => {
        const d = parseExpDate("2025-06-30");
        assert.ok(d instanceof Date);
        assert.equal(d.getUTCFullYear(), 2025);
    });

    it("returns null for null input", () => {
        assert.equal(parseExpDate(null), null);
    });

    it("returns null for empty string", () => {
        assert.equal(parseExpDate(""), null);
    });

    it("returns null for invalid date string", () => {
        assert.equal(parseExpDate("not-a-date"), null);
    });
});

// ── extractCertImageUrl() ─────────────────────────────────────────────────────

describe("extractCertImageUrl()", () => {
    it("composes OSS URL from old webpage URL (slug already encoded in MongoDB)", () => {
        const field = { content: "https://www.cert-inquiry.cn/cert/0611-JX-%E2%85%A1-2022001" };
        assert.equal(
            extractCertImageUrl(field),
            "https://qrcode-portal.oss-cn-hangzhou.aliyuncs.com/cert-image/0611-JX-%E2%85%A1-2022001.png",
        );
    });

    it("passes through an existing OSS URL unchanged", () => {
        const url = "https://qrcode-portal.oss-cn-hangzhou.aliyuncs.com/cert-image/0018-LX-Ⅰ-2024001.png";
        assert.equal(extractCertImageUrl({ content: url }), url);
    });

    it("returns null for null field", () => {
        assert.equal(extractCertImageUrl(null), null);
    });

    it("returns null for empty content", () => {
        assert.equal(extractCertImageUrl({ content: "" }), null);
    });

    it("returns null for old URL with no slug after /cert/", () => {
        assert.equal(extractCertImageUrl({ content: "https://www.cert-inquiry.cn/cert/" }), null);
    });
});

// ── mapDoc() ─────────────────────────────────────────────────────────────────

describe("mapDoc() — sample document", () => {
    const { data, warnings } = mapDoc(SAMPLE_DOC);

    it("extracts name", () => assert.equal(data.name, "鲍士坤"));
    it("extracts idNum", () => assert.equal(data.idNum, "340402197709040611"));
    it("extracts organization", () => assert.equal(data.organization, "安徽大华检测技术有限公司"));
    it("extracts certNum", () => assert.equal(data.certNum, "JX-Ⅱ-2022001"));
    it("extracts certType", () => assert.equal(data.certType, "MTM"));
    it("extracts issuingAgency", () => assert.equal(data.issuingAgency, "中国电机工程学会电站焊接专业委员会"));

    it("parses expDate to a Date", () => {
        assert.ok(data.expDate instanceof Date);
        assert.equal(data.expDate.getUTCFullYear(), 2025);
        assert.equal(data.expDate.getUTCMonth(), 5);
        assert.equal(data.expDate.getUTCDate(), 30);
    });

    it("composes certImageUrl from old webpage URL (slug passed through as-is)", () => {
        assert.equal(
            data.certImageUrl,
            "https://qrcode-portal.oss-cn-hangzhou.aliyuncs.com/cert-image/0611-JX-%E2%85%A1-2022001.png",
        );
    });

    it("extracts profileImageUrl from OSS", () => {
        assert.ok(data.profileImageUrl.includes("profile-photo/"));
    });

    it("maps name canvas position", () => {
        assert.equal(data.nameLeft, 1175);
        assert.equal(data.nameTop, 1765);
        assert.equal(data.nameScaleX, 1);
        assert.equal(data.nameScaleY, 1);
        assert.equal(data.nameAngle, 0);
    });

    it("maps organization scaleX as float", () => {
        assert.ok(Math.abs(data.organizationScaleX - 0.8473392933163049) < 1e-10);
    });

    it("maps profileImage position", () => {
        assert.equal(data.profileLeft, 1850);
        assert.equal(data.profileTop, 1940);
        assert.ok(Math.abs(data.profileScaleX - 0.8951965065502182) < 1e-10);
    });

    it("warns about profile-photo/ prefix mismatch", () => {
        assert.ok(warnings.some(w => w.includes("profile-photo/")));
    });

    it("produces no other warnings", () => {
        const otherWarnings = warnings.filter(w => !w.includes("profile-photo/"));
        assert.equal(otherWarnings.length, 0);
    });
});

describe("mapDoc() — missing required fields", () => {
    it("warns when name is missing", () => {
        const { warnings } = mapDoc({ ...SAMPLE_DOC, name: undefined });
        assert.ok(warnings.some(w => w.includes("missing name")));
    });

    it("warns when idNum is missing", () => {
        const { warnings } = mapDoc({ ...SAMPLE_DOC, idNum: undefined });
        assert.ok(warnings.some(w => w.includes("missing idNum")));
    });

    it("warns when expDate is unparseable", () => {
        const bad = { ...SAMPLE_DOC, expDate: { content: "invalid" } };
        const { warnings } = mapDoc(bad);
        assert.ok(warnings.some(w => w.includes("unparseable expDate")));
    });

    it("sets all position fields to null when sprite field is absent", () => {
        const { data } = mapDoc({ ...SAMPLE_DOC, name: undefined });
        assert.equal(data.nameLeft, null);
        assert.equal(data.nameTop, null);
        assert.equal(data.nameScaleX, null);
    });
});
