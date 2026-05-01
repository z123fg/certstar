import type { CertTypeCode } from "./certTypes";

export interface SpriteField {
  isSprite: true;
  type: "text" | "image";
  content: string;
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  originX?: string;
}

export interface DataField {
  isSprite: false;
  type: "text" | "image";
  content: string;
}

export interface CertRecord {
  _id: string;
  // sprite fields — positioned on the canvas
  name: SpriteField;
  idNum: SpriteField;
  organization: SpriteField;
  certNum: SpriteField;
  expDate: SpriteField;
  profileImage: SpriteField;
  // data-only fields
  certType: DataField & { content: CertTypeCode };
  issuingAgency: DataField;
  certImage: DataField;
  createTime: DataField;
  updateTime: DataField;
}

export type CertRecordInput = Omit<CertRecord, "_id" | "createTime" | "updateTime" | "certImage">;
