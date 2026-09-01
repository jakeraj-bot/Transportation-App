import { redirect } from "next/navigation";

export default function EmergencyQuotesPage() {
  redirect("/route-descriptions?kind=emergency_quote");
}
