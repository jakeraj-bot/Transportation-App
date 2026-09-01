import { redirect } from "next/navigation";

export default function EmergencyQuoteDetailPage() {
  redirect("/route-descriptions?kind=emergency_quote");
}
