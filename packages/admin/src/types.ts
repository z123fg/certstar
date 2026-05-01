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
  nameOriginX?: string;
  idNumLeft?: number;
  idNumTop?: number;
  idNumScaleX?: number;
  idNumScaleY?: number;
  idNumAngle?: number;
  idNumOriginX?: string;
  organizationLeft?: number;
  organizationTop?: number;
  organizationScaleX?: number;
  organizationScaleY?: number;
  organizationAngle?: number;
  organizationOriginX?: string;
  certNumLeft?: number;
  certNumTop?: number;
  certNumScaleX?: number;
  certNumScaleY?: number;
  certNumAngle?: number;
  certNumOriginX?: string;
  expDateLeft?: number;
  expDateTop?: number;
  expDateScaleX?: number;
  expDateScaleY?: number;
  expDateAngle?: number;
  expDateOriginX?: string;
  profileLeft?: number;
  profileTop?: number;
  profileScaleX?: number;
  profileScaleY?: number;
  profileAngle?: number;
}
