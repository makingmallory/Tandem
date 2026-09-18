import { Avatar } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Pill";
import type { HouseholdMember } from "@/data/household/types";

export function MemberList({ members }: Readonly<{ members: HouseholdMember[] }>) {
  return (
    <ul className="member-list">
      {members.map((member, index) => (
        <li className="member-row" key={member.id}>
          <Avatar name={member.profile.display_name} accentIndex={index} />
          <div>
            <p className="member-row__name">{member.profile.display_name}</p>
            <p className="muted-copy">Joined your household</p>
          </div>
          <Pill>{member.role === "owner" ? "Owner" : "Member"}</Pill>
        </li>
      ))}
    </ul>
  );
}
