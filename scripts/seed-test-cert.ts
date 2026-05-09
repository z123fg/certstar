/**
 * Seeds one cert record from the MongoDB migration snapshot into PostgreSQL.
 * Run from the repo root with:
 *   cd packages/backend && npx ts-node ../../scripts/seed-test-cert.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const data = {
    name:             "鲍士坤",
    idNum:            "340402197709040611",
    organization:     "安徽大华检测技术有限公司",
    certNum:          "JX-Ⅱ-2022001",
    certType:         "MTM",
    issuingAgency:    "中国电机工程学会电站焊接专业委员会",
    expDate:          new Date("2026-06-30"),
    certImageUrl:     "https://qrcode-portal.oss-cn-hangzhou.aliyuncs.com/cert-image/0611-JX-Ⅱ-2022001.png",
    profileImageUrl:  "https://qrcode-portal.oss-cn-hangzhou.aliyuncs.com/profile-photo/JX-%E2%85%A1-2022001_0611.jpeg",

    nameLeft: 1175,  nameTop: 1765,  nameScaleX: 1,                    nameScaleY: 1, nameAngle: 0,
    idNumLeft: 957,  idNumTop: 1942, idNumScaleX: 1,                    idNumScaleY: 1, idNumAngle: 0,
    organizationLeft: 957, organizationTop: 2100, organizationScaleX: 0.8473392933163049, organizationScaleY: 1, organizationAngle: 0,
    certNumLeft: 1175, certNumTop: 2265, certNumScaleX: 1,              certNumScaleY: 1, certNumAngle: 0,
    expDateLeft: 819,  expDateTop: 2435, expDateScaleX: 1,              expDateScaleY: 1, expDateAngle: 0,
    profileLeft: 1850, profileTop: 1940, profileScaleX: 0.8951965065502182, profileScaleY: 0.8951965065502182, profileAngle: 0,
};

async function main() {
    const cert = await prisma.cert.upsert({
        where: { certNum: data.certNum },
        update: data,
        create: data,
    });
    console.log("Upserted cert:", cert.id, cert.name, cert.certNum);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
