import { prisma } from "@/lib/prisma";
import { SETTING_ID } from "@/lib/settings";

export async function SignatoryBlock() {
  const setting = await prisma.setting.findUnique({
    where: { id: SETTING_ID },
    select: { signatoryName: true, signatoryDesignation: true },
  });

  return (
    <div className="mt-12 text-sm text-slate-700">
      <div className="w-56 border-b border-slate-400 h-10" />
      <div className="mt-1 font-medium">Authorized Signatory</div>
      <div className="mt-3 space-y-1">
        <div>Name: {setting?.signatoryName || "________________________"}</div>
        <div>Designation: {setting?.signatoryDesignation || "________________________"}</div>
        <div>Date: ________________________</div>
      </div>
    </div>
  );
}
