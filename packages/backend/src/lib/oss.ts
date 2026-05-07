import OSS from "ali-oss";

const oss = new OSS({
    region: process.env.OSS_REGION!,
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
    bucket: process.env.OSS_BUCKET!,
});

export default oss;
