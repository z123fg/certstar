/**
 * Snapshot test for mapDoc() output.
 * Shows the exact object that gets written to PostgreSQL for a real MongoDB document.
 * Run with: node --test scripts/migrate-mongo-snapshot.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapDoc, extractCertImageUrl } from "./migrate-mongo-helpers.js";

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

/**
 * Expected output written to PostgreSQL.
 * This is the reference snapshot — if mapDoc() output changes, this test fails.
 */
const EXPECTED_DATA = {
    // ── Core fields ───────────────────────────────────────────────────────────
    name:             "鲍士坤",
    idNum:            "340402197709040611",
    organization:     "安徽大华检测技术有限公司",
    certNum:          "JX-Ⅱ-2022001",
    certType:         "MTM",
    issuingAgency:    "中国电机工程学会电站焊接专业委员会",
    expDate:          new Date("2025-06-30"),

    // certImage.content was a webpage URL — slug extracted and composed into OSS URL
    certImageUrl:     "https://qrcode-portal.oss-cn-hangzhou.aliyuncs.com/cert-image/0611-JX-%E2%85%A1-2022001.png",

    // profileImage.content is the OSS URL (old prefix — see warning)
    profileImageUrl:  "https://qrcode-portal.oss-cn-hangzhou.aliyuncs.com/profile-photo/JX-%E2%85%A1-2022001_0611.jpeg",

    // ── Canvas positions ──────────────────────────────────────────────────────
    nameLeft:         1175,
    nameTop:          1765,
    nameScaleX:       1,
    nameScaleY:       1,
    nameAngle:        0,

    idNumLeft:        957,
    idNumTop:         1942,
    idNumScaleX:      1,
    idNumScaleY:      1,
    idNumAngle:       0,

    organizationLeft:   957,
    organizationTop:    2100,
    organizationScaleX: 0.8473392933163049,
    organizationScaleY: 1,
    organizationAngle:  0,

    certNumLeft:      1175,
    certNumTop:       2265,
    certNumScaleX:    1,
    certNumScaleY:    1,
    certNumAngle:     0,

    expDateLeft:      819,
    expDateTop:       2435,
    expDateScaleX:    1,
    expDateScaleY:    1,
    expDateAngle:     0,

    profileLeft:      1850,
    profileTop:       1940,
    profileScaleX:    0.8951965065502182,
    profileScaleY:    0.8951965065502182,
    profileAngle:     0,

};

/**
 * Expected warnings for this document.
 */
const EXPECTED_WARNINGS = [
    `profileImageUrl uses old prefix "profile-photo/" — backend proxy validation may reject it`,
];

describe("mapDoc() snapshot — PostgreSQL write reference", () => {
    const { data, warnings } = mapDoc(SAMPLE_DOC);

    it("data matches expected snapshot", () => {
        assert.deepEqual(data, {
            name:             EXPECTED_DATA.name,
            idNum:            EXPECTED_DATA.idNum,
            organization:     EXPECTED_DATA.organization,
            certNum:          EXPECTED_DATA.certNum,
            certType:         EXPECTED_DATA.certType,
            issuingAgency:    EXPECTED_DATA.issuingAgency,
            expDate:          EXPECTED_DATA.expDate,
            certImageUrl:     EXPECTED_DATA.certImageUrl,
            profileImageUrl:  EXPECTED_DATA.profileImageUrl,

            nameLeft:         EXPECTED_DATA.nameLeft,
            nameTop:          EXPECTED_DATA.nameTop,
            nameScaleX:       EXPECTED_DATA.nameScaleX,
            nameScaleY:       EXPECTED_DATA.nameScaleY,
            nameAngle:        EXPECTED_DATA.nameAngle,

            idNumLeft:        EXPECTED_DATA.idNumLeft,
            idNumTop:         EXPECTED_DATA.idNumTop,
            idNumScaleX:      EXPECTED_DATA.idNumScaleX,
            idNumScaleY:      EXPECTED_DATA.idNumScaleY,
            idNumAngle:       EXPECTED_DATA.idNumAngle,

            organizationLeft:   EXPECTED_DATA.organizationLeft,
            organizationTop:    EXPECTED_DATA.organizationTop,
            organizationScaleX: EXPECTED_DATA.organizationScaleX,
            organizationScaleY: EXPECTED_DATA.organizationScaleY,
            organizationAngle:  EXPECTED_DATA.organizationAngle,

            certNumLeft:      EXPECTED_DATA.certNumLeft,
            certNumTop:       EXPECTED_DATA.certNumTop,
            certNumScaleX:    EXPECTED_DATA.certNumScaleX,
            certNumScaleY:    EXPECTED_DATA.certNumScaleY,
            certNumAngle:     EXPECTED_DATA.certNumAngle,

            expDateLeft:      EXPECTED_DATA.expDateLeft,
            expDateTop:       EXPECTED_DATA.expDateTop,
            expDateScaleX:    EXPECTED_DATA.expDateScaleX,
            expDateScaleY:    EXPECTED_DATA.expDateScaleY,
            expDateAngle:     EXPECTED_DATA.expDateAngle,

            profileLeft:      EXPECTED_DATA.profileLeft,
            profileTop:       EXPECTED_DATA.profileTop,
            profileScaleX:    EXPECTED_DATA.profileScaleX,
            profileScaleY:    EXPECTED_DATA.profileScaleY,
            profileAngle:     EXPECTED_DATA.profileAngle,
        });
    });

    it("warnings match expected", () => {
        assert.deepEqual(warnings, EXPECTED_WARNINGS);
    });
});
