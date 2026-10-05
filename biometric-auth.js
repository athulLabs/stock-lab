import {
  BiometricAuth
} from "@aparajita/capacitor-biometric-auth";

window.StockLabBiometric = {

  async check() {
    try {
      return await BiometricAuth.checkBiometry();
    } catch (error) {
      console.error("Biometric check failed:", error);

      return {
        isAvailable: false,
        strongBiometryIsAvailable: false
      };
    }
  },

  async authenticate() {
    try {
      await BiometricAuth.authenticate({
        reason: "Unlock Stock Lab",
        cancelTitle: "Cancel",
        allowDeviceCredential: true,
        androidTitle: "Unlock Stock Lab",
        androidSubtitle: "Use your fingerprint, face, or device PIN",
        androidConfirmationRequired: false
      });

      return {
        success: true
      };

    } catch (error) {

      console.error(
        "Biometric authentication failed:",
        error
      );

      return {
        success: false,
        error: error?.message || "Authentication failed",
        code: error?.code || ""
      };
    }
  }
};

console.log("Stock Lab biometric authentication loaded");
