import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerTypeHint,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerScanOrientation,
  CapacitorBarcodeScannerAndroidScanningLibrary
} from "@capacitor/barcode-scanner";

window.StockLabNativeScanner = {
  available: true,

  async scan() {
    try {
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.ALL,

        scanInstructions: "Place the barcode inside the frame",

        scanButton: true,
        scanText: "Scan",

        cameraDirection:
          CapacitorBarcodeScannerCameraDirection.BACK,

        scanOrientation:
          CapacitorBarcodeScannerScanOrientation.ADAPTIVE,

        android: {
          scanningLibrary:
            CapacitorBarcodeScannerAndroidScanningLibrary.ZXING
        }
      });

      return {
        success: true,
        code: result?.ScanResult || "",
        format: result?.format ?? null
      };

    } catch (error) {

      console.error("Stock Lab native scanner error:", error);

      return {
        success: false,
        code: "",
        error:
          error?.message ||
          error?.errorMessage ||
          "Scanner cancelled or unavailable"
      };
    }
  }
};

console.log("Stock Lab native scanner loaded");
