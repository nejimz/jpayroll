import bwipjs from "bwip-js";
import QRCode from "qrcode";

function pngBufferToDataUrl(buf: Buffer): string {
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/** Code128 barcode PNG as a data URL for @react-pdf Image. */
export async function renderBarcodePngDataUrl(payload: string): Promise<string> {
  const buf = await bwipjs.toBuffer({
    bcid: "code128",
    text: payload,
    scale: 3,
    height: 12,
    includetext: false,
    paddingwidth: 4,
    paddingheight: 2,
  });
  return pngBufferToDataUrl(buf);
}

/** QR code PNG as a data URL for @react-pdf Image. */
export async function renderQrPngDataUrl(payload: string): Promise<string> {
  const buf = await QRCode.toBuffer(payload, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
  return pngBufferToDataUrl(buf);
}
