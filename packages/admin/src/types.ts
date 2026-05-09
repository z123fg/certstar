import type { CertTypeCode } from "@certstar/shared";

export interface CertDraft {
  _localId: string;
  name: string;
  idNum: string;
  organization: string;
  certNum: string;
  expDate: string;
  issuingAgency: string;
  certType: CertTypeCode;
}

export interface Cert {
  id: string;
  idNum: string;
  certNum: string;
  name: string;
  organization: string;
  issuingAgency: string;
  expDate: string;
  certType: CertTypeCode;
  certImageUrl?: string;
  profileImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  // canvas layout
  nameLeft?: number;
  nameTop?: number;
  nameScaleX?: number;
  nameScaleY?: number;
  nameAngle?: number;
  idNumLeft?: number;
  idNumTop?: number;
  idNumScaleX?: number;
  idNumScaleY?: number;
  idNumAngle?: number;
  organizationLeft?: number;
  organizationTop?: number;
  organizationScaleX?: number;
  organizationScaleY?: number;
  organizationAngle?: number;
  certNumLeft?: number;
  certNumTop?: number;
  certNumScaleX?: number;
  certNumScaleY?: number;
  certNumAngle?: number;
  expDateLeft?: number;
  expDateTop?: number;
  expDateScaleX?: number;
  expDateScaleY?: number;
  expDateAngle?: number;
  profileLeft?: number;
  profileTop?: number;
  profileScaleX?: number;
  profileScaleY?: number;
  profileAngle?: number;
}
