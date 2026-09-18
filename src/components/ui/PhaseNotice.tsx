import { Sparkles } from "lucide-react";
import { PlaceholderCard } from "@/components/ui/PlaceholderCard";

type PhaseNoticeProps = {
  title: string;
  description: string;
  accent?: "rose" | "sky" | "amber" | "lavender" | "mint" | "peach";
};

export function PhaseNotice(props: Readonly<PhaseNoticeProps>) {
  return <PlaceholderCard icon={Sparkles} {...props} />;
}
