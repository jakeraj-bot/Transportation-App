import { redirect } from "next/navigation";

export default function NewEmergencyQuotePage() {
  redirect("/route-descriptions/new?kind=emergency_quote");
}
