const intl = {
    // ── Field labels ────────────────────────────────────────────────────────
    name: "姓名",
    idNum: "身份证号",
    organization: "工作单位",
    certNum: "证书编号",
    expDate: "有效期至",
    expDateHint: "格式示例：2026-12-30",
    expDateFormatError: "格式不正确，支持 yyyy-mm-dd 或 yyyy/mm/dd",
    issuingAgency: "发证机构",
    certType: "证书类型",
    profileImage: "证件照",
    uploadPhoto: "上传证件照",
    changePhoto: "更换证件照",
    photoAlt: "证件照预览",

    // ── Auth ─────────────────────────────────────────────────────────────────
    login: "登录",
    logout: "登出",
    username: "用户名",
    password: "密码",
    loginError: "用户名或密码错误",
    sessionExpired: "登录已过期，请重新登录",
    notLoggedIn: "请先登录。",

    // ── Common actions ───────────────────────────────────────────────────────
    back: "返回",
    backToList: "返回列表",
    backToUpload: "返回上传",
    backToPreview: "返回预览",
    submit: "提交",
    cancel: "取消",
    delete: "删除",
    refresh: "刷新",
    filter: "筛选",
    search: "搜索",
    selectFile: "选择文件",
    parsePreview: "解析预览",
    reselectFiles: "重新选择文件",
    saveDraft: "保存草稿",

    // ── Cert actions ─────────────────────────────────────────────────────────
    addOne: "制作证书",
    addMany: "批量制作",
    pdfBatchEntry: "PDF 证书录入",
    editCert: "编辑证书",
    download: "下载",
    downloadZip: "下载 ZIP",
    stamped: "带章版",
    stampless: "无章版",
    submitAll: "生成并上传",
    continueUpload: "继续录入",
    continueBatch: "继续批量制作",

    // ── Page titles ──────────────────────────────────────────────────────────
    batchTitle: "批量制作证书",
    pdfBatchTitle: "PDF 证书录入",
    editDraft: "编辑草稿",
    batchEditDraft: "编辑批量草稿",

    // ── Canvas hint ──────────────────────────────────────────────────────────
    ctrlMultiSelect: "按住 Ctrl 可多选，拖动可调整文字位置",

    // ── Upload ───────────────────────────────────────────────────────────────
    uploadCsv: "上传 .csv 文件",
    uploadImages: "上传证件照（多个）",
    csvFile: "CSV 文件",
    csvColumnsHint:
        "必须包含列：name, idNum, organization, certNum, expDate, issuingAgency, certType（中文名称，如：焊接热处理操作人员）",
    photoFilesHint: "照片文件（文件名为身份证号，可多选）",
    pdfFilesHint: "PDF 文件（文件名为证书编号，可多选）",

    // ── Empty / not-found states ─────────────────────────────────────────────
    noData: "暂无证书数据",
    noPreviewData: "没有可预览的数据，请先上传 CSV 文件。",
    goUpload: "去上传",
    draftNotFound: "未找到这条草稿。",
    batchDraftNotFound: "未找到这条批量草稿。",
    noPdfFound: "未找到对应 PDF 文件",

    // ── Confirmation dialog ──────────────────────────────────────────────────
    confirmDeleteTitle: "确认删除",
    confirmDeleteMsg: "删除后无法恢复，确认删除此证书吗？",
    confirmDeleteBtn: "确认删除",

    // ── Compliance mode ──────────────────────────────────────────────────────
    complianceMode: "完全合规模式",
    complianceModeDesc:
        "开启后，证书图片须由发证机构提供并通过 PDF 录入；禁止从画布制作或下载有章证书",
    complianceNoStampedSubmit: "当前模式不允许上传有章证书",
    complianceNoStampedDownload: "当前模式不允许下载有章证书",

    // ── Success / error messages ─────────────────────────────────────────────
    fetchError: "获取证书列表失败",
    saveSuccess: "证书创建成功！",
    updateSuccess: "证书更新成功！",
    saveError: "保存失败，请重试",
    downloadError: "下载失败，请重试",
    deleteSuccess: "证书已删除",
    deleteError: "删除失败，请重试",
    uploadImageError: "图片上传失败，请检查网络后重试",
    pdfUploadError: "PDF 上传失败，请检查网络后重试",
} as const;

export default intl;
