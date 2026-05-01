export const certTypeMap = {
  WTOP: "焊接热处理操作人员",
  WTTP: "焊接热处理技术人员",
  MAAM: "光谱分析（A类）中级人员",
  MAAS: "光谱分析（A类）高级人员",
  MABM: "光谱分析（B类）中级人员",
  MPE: "力学性能试验初级人员",
  MPM: "力学性能试验中级人员",
  MPS: "力学性能试验高级人员",
  MTE: "金相检验初级人员",
  MTM: "金相检验中级人员",
  MTS: "金相检验高级人员",
} as const;

export type CertTypeCode = keyof typeof certTypeMap;
