import { fabric } from "fabric";
import QRCode from "qrcode";
import type { Cert } from "../types";

// ─── Canvas dimensions (A4 at 300dpi) ────────────────────────────────────────
const ORIGINAL_WIDTH = 2481;
export const ORIGINAL_HEIGHT = 3509;
// Display at actual print size: screen is 96dpi, canvas is 300dpi
export const PRINT_ZOOM = 96 / 300;
let currentZoom = PRINT_ZOOM;

// ─── Default positions for each text field ───────────────────────────────────
const DEFAULT_TEXT_PROPS: Record<
    string,
    fabric.ITextOptions & { left: number; top: number }
> = {
    name: {
        left: 1175,
        top: 1765,
        fontSize: 60,
        fontFamily: "SimSun",
        fontWeight: 650,
        originX: "center",
        originY: "center",
        textAlign: "center",
    },
    idNum: {
        left: 1175,
        top: 1942,
        fontSize: 60,
        fontFamily: "SimSun",
        fontWeight: 650,
        originX: "center",
        originY: "center",
        textAlign: "center",
    },
    organization: {
        left: 1175,
        top: 2100,
        fontSize: 60,
        fontFamily: "SimSun",
        fontWeight: 650,
        originX: "center",
        originY: "center",
        textAlign: "center",
    },
    certNum: {
        left: 1175,
        top: 2265,
        fontSize: 60,
        fontFamily: "SimSun",
        fontWeight: 650,
        originX: "center",
        originY: "center",
        textAlign: "center",
    },
    expDate: {
        left: 819,
        top: 2435,
        fontSize: 60,
        fontFamily: "SimSun",
        fontWeight: 650,
        originX: "center",
        originY: "center",
        textAlign: "center",
    },
};

const DEFAULT_IMAGE_PROPS = {
    left: 1850,
    top: 1940,
    originX: "center",
    originY: "center",
    cornerStrokeColor: "#CD5C5C",
    cornerColor: "#A52A2A",
    borderColor: "#4169E1",
    transparentCorners: false,
    selectable: true,
    hasControls: true,
};

const CONTROL_STYLE = {
    cornerStrokeColor: "#CD5C5C",
    cornerColor: "#A52A2A",
    borderColor: "#4169E1",
    transparentCorners: false,
    padding: 10,
};

// ─── Module-level canvas singleton ───────────────────────────────────────────
let canvas: fabric.Canvas | null = null;

export const getCanvas = () => canvas;

// Plain helper instead of prototype extension — avoids declaration merging issues
type FabricEntry = fabric.Object & { entry?: string };
const getObjsByEntry = (entry: string): FabricEntry[] =>
    (canvas?.getObjects() ?? []).filter(
        (o): o is FabricEntry => (o as FabricEntry).entry === entry,
    );

// ─── Init / destroy ───────────────────────────────────────────────────────────
export const loadFonts = async () => document.fonts.load("60px SimSun");

export const initCanvas = (canvasId = "main-canvas", zoom = currentZoom) => {
    destroyCanvas();
    currentZoom = zoom;
    canvas = new fabric.Canvas(canvasId, {
        preserveObjectStacking: true,
        selectionKey: "ctrlKey",
        controlsAboveOverlay: true,
    });
    canvas.setZoom(zoom);
    canvas.setWidth(ORIGINAL_WIDTH * zoom);
    canvas.setHeight(ORIGINAL_HEIGHT * zoom);
    canvas.renderAll();
};

export const setCanvasZoom = (zoom: number) => {
    if (!canvas) return;
    currentZoom = zoom;
    canvas.setZoom(zoom);
    canvas.setWidth(ORIGINAL_WIDTH * zoom);
    canvas.setHeight(ORIGINAL_HEIGHT * zoom);
    canvas.renderAll();
};

export const destroyCanvas = () => {
    canvas?.dispose();
    canvas = null;
};

// ─── Template ────────────────────────────────────────────────────────────────
export type CertVariant = "stamped" | "stampless";

export const loadTemplate = (
    certType: string,
    variant: CertVariant = "stamped",
): Promise<void> =>
    new Promise((resolve, reject) => {
        fabric.Image.fromURL(
            `${import.meta.env.VITE_OSS_BASE_URL}/cert-template/${variant}/${certType}.jpg`,
            (img: fabric.Image) => {
                if (!canvas) return resolve();
                if (!img.width || !img.height) {
                    reject(
                        new Error(
                            `Template not found: ${variant}/${certType}.jpg`,
                        ),
                    );
                    return;
                }
                getObjsByEntry("template").forEach((o) => canvas!.remove(o));
                (img as FabricEntry).entry = "template";
                img.set({
                    left: 0,
                    top: 0,
                    scaleX: ORIGINAL_WIDTH / img.width!,
                    scaleY: ORIGINAL_HEIGHT / img.height!,
                    selectable: false,
                    lockMovementX: true,
                    lockMovementY: true,
                });
                canvas.add(img).sendToBack(img).renderAll();
                resolve();
            },
            { crossOrigin: "anonymous" },
        );
    });

// ─── Text fields ─────────────────────────────────────────────────────────────
const getTextValue = (key: string, value: string) => {
    if (key === "expDate") return new Date(value).getUTCFullYear().toString();
    return value;
};

type FabricTextEntry = fabric.Text & { entry?: string };

const adjustTextSize = (obj: FabricTextEntry) => {
    if (obj.entry === "expDate") return;
    const defaults = DEFAULT_TEXT_PROPS[obj.entry ?? ""];
    if (!defaults) return;

    if (obj.width! < 450) {
        obj.set({
            originX: "center",
            left: 1175,
            scaleX: 1,
            top: defaults.top,
        });
    } else if (obj.width! < 622) {
        obj.set({ originX: "left", left: 957, top: defaults.top });
    } else if (obj.width! < 1244) {
        obj.set({
            originX: "left",
            left: 957,
            scaleX: 622 / obj.width!,
            top: defaults.top,
        });
    } else {
        const mid = Math.round(obj.text!.length / 2);
        obj.set({
            text: obj.text!.slice(0, mid) + "\n" + obj.text!.slice(mid),
            originX: "left",
            left: 957,
            scaleX: (622 / obj.width!) * 2,
            top: defaults.top - obj.height! / 2,
            lineHeight: 0.9,
        });
    }
};

export const renderTextFields = (cert: Partial<Cert>) => {
    if (!canvas) return;
    const fields = [
        "name",
        "idNum",
        "organization",
        "certNum",
        "expDate",
    ] as const;
    fields.forEach((key) => {
        const value = String(cert[key] ?? "");
        const defaults = DEFAULT_TEXT_PROPS[key];
        const existing = getObjsByEntry(key)[0] as FabricTextEntry | undefined;

        if (existing) {
            existing.set({ text: getTextValue(key, value) });
            adjustTextSize(existing);
            canvas!.renderAll();
            return;
        }

        const savedLeft = cert[`${key}Left` as keyof Cert] as
            | number
            | undefined;
        const savedTop = cert[`${key}Top` as keyof Cert] as number | undefined;
        const savedScaleX = cert[`${key}ScaleX` as keyof Cert] as
            | number
            | undefined;
        const savedScaleY = cert[`${key}ScaleY` as keyof Cert] as
            | number
            | undefined;
        const savedAngle = cert[`${key}Angle` as keyof Cert] as
            | number
            | undefined;
        const obj = new fabric.Text(getTextValue(key, value), {
            ...CONTROL_STYLE,
            ...defaults,
            left: savedLeft ?? defaults.left,
            top: savedTop ?? defaults.top,
            scaleX: savedScaleX ?? 1,
            scaleY: savedScaleY ?? 1,
            angle: savedAngle ?? 0,
            originX: "center",
        }) as FabricTextEntry;
        obj.entry = key;
        adjustTextSize(obj);
        canvas!.add(obj).bringToFront(obj);
    });
    canvas.renderAll();
};

// ─── Profile image ────────────────────────────────────────────────────────────
export const renderProfileImage = (
    dataUrl: string,
    cert?: Partial<Cert>,
): Promise<void> =>
    new Promise((resolve) => {
        if (!canvas) return resolve();
        getObjsByEntry("profileImage").forEach((o) => canvas!.remove(o));
        if (!dataUrl) return resolve();
        fabric.Image.fromURL(
            dataUrl,
            (img: fabric.Image) => {
                (img as FabricEntry).entry = "profileImage";
                img.set({
                    ...DEFAULT_IMAGE_PROPS,
                    left: cert?.profileLeft ?? DEFAULT_IMAGE_PROPS.left,
                    top: cert?.profileTop ?? DEFAULT_IMAGE_PROPS.top,
                    angle: cert?.profileAngle ?? 0,
                    ...(cert?.profileScaleX != null
                        ? { scaleX: cert.profileScaleX }
                        : {}),
                    ...(cert?.profileScaleY != null
                        ? { scaleY: cert.profileScaleY }
                        : {}),
                });
                if (cert?.profileScaleX == null) img.scaleToHeight(410);
                canvas!.add(img).bringToFront(img).renderAll();
                resolve();
            },
            { crossOrigin: "anonymous" },
        );
    });

// ─── QR code ─────────────────────────────────────────────────────────────────
export const renderQRCode = async (
    idNum: string,
    certNum: string,
): Promise<void> => {
    if (!canvas || !idNum || !certNum) return;
    const link = `${import.meta.env.VITE_CERT_INQUIRY_URL}/${idNum.slice(-4)}-${certNum}`;
    const dataUrl = await QRCode.toDataURL(link);
    await new Promise<void>((resolve) => {
        fabric.Image.fromURL(dataUrl, (img: fabric.Image) => {
            if (!canvas) return resolve();
            getObjsByEntry("qrcode").forEach((o) => canvas!.remove(o));
            (img as FabricEntry).entry = "qrcode";
            img.set({
                originX: "center",
                originY: "center",
                left: 740,
                top: 2743,
                angle: 0,
            });
            img.scaleToWidth(300);
            canvas.add(img).bringToFront(img).renderAll();
            resolve();
        });
    });
};

// ─── Snapshot (positions → flat cert fields) ─────────────────────────────────
export const getSnapshotLayout = (): Partial<Cert> => {
    if (!canvas) return {};
    const snapshot: Partial<Cert> = {};
    const excluded = new Set(["template", "qrcode"]);

    (canvas.getObjects() as FabricEntry[]).forEach((obj) => {
        const key = obj.entry;
        if (!key || excluded.has(key)) return;

        if (key === "profileImage") {
            snapshot.profileLeft = obj.left;
            snapshot.profileTop = obj.top;
            snapshot.profileScaleX = obj.scaleX;
            snapshot.profileScaleY = obj.scaleY;
            snapshot.profileAngle = obj.angle;
        } else {
            (snapshot as any)[`${key}Left`] = obj.left;
            (snapshot as any)[`${key}Top`] = obj.top;
            (snapshot as any)[`${key}ScaleX`] = obj.scaleX;
            (snapshot as any)[`${key}ScaleY`] = obj.scaleY;
            (snapshot as any)[`${key}Angle`] = obj.angle;
        }
    });
    return snapshot;
};

// ─── Export ───────────────────────────────────────────────────────────────────
export const exportCanvasAsDataUrl = (): string =>
    canvas?.toDataURL({
        format: "png",
        multiplier: 1 / currentZoom,
        quality: 1,
    }) ?? "";

/**
 * Render a cert to a PNG Blob using a hidden off-screen canvas.
 * Safe to call while the editor canvas is active — saves and restores the singleton.
 * The hidden <canvas id="download-canvas"> must exist in the DOM at call time.
 */
export const renderCertToBlob = async (
    cert: Partial<Cert>,
    profileDataUrl: string,
    variant: CertVariant = "stamped",
): Promise<Blob> => {
    // Detach the current canvas from the singleton so initCanvas doesn't destroy it
    const editorCanvas = canvas;
    const editorZoom = currentZoom;
    canvas = null;
    try {
        initCanvas("download-canvas", editorZoom);
        await loadTemplate(cert.certType!, variant);
        renderTextFields(cert);
        if (profileDataUrl) await renderProfileImage(profileDataUrl, cert);
        if (cert.idNum && cert.certNum)
            await renderQRCode(cert.idNum, cert.certNum);
        return await fetch(exportCanvasAsDataUrl()).then((r) => r.blob());
    } finally {
        destroyCanvas();
        canvas = editorCanvas;
        currentZoom = editorZoom;
    }
};

/** Trigger a browser file download for a given Blob. */
export const triggerBlobDownload = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
};
