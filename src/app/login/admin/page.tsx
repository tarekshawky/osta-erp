import { PinPad } from "@/components/PinPad";
import { loginAdmin } from "./actions";

export default function AdminLoginPage() {
  return <PinPad title="Admin Login" action={loginAdmin} redirectTo="/admin" />;
}
