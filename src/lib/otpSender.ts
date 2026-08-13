// Pluggable OTP delivery for the customer-facing phone-login API. This is the ONE
// file to touch to go live with real SMS/WhatsApp delivery -- implement OtpSender
// for Twilio SMS (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER) or the
// Meta WhatsApp Cloud API, then swap the `otpSender` export below.
//
// Until then, codes are only ever logged to the server console -- production OTP
// delivery does NOT reach a real customer phone yet.
export interface OtpSender {
  send(phone: string, code: string): Promise<void>;
}

class ConsoleOtpSender implements OtpSender {
  async send(phone: string, code: string) {
    console.log(`[OTP] ${phone}: ${code}`);
  }
}

export const otpSender: OtpSender = new ConsoleOtpSender();
