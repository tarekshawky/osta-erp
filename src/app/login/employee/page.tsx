import { PinPad } from "@/components/PinPad";
import { loginEmployee } from "./actions";

export default function EmployeeLoginPage() {
  return <PinPad title="Employee Login" action={loginEmployee} redirectTo="/employee" />;
}
