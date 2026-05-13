"use client";

import { getRoleLabel } from "@/lib/rbac";
import type { TeamMemberRole } from "@/types";

const ROLES: TeamMemberRole[] = ["leader", "manager", "operator", "viewer"];

type Props = {
  value: TeamMemberRole;
  onChange: (role: TeamMemberRole) => void;
  disabled?: boolean;
  excludeLeader?: boolean;
};

export default function RoleSelector({ value, onChange, disabled, excludeLeader }: Props) {
  const options = excludeLeader ? ROLES.filter((r) => r !== "leader") : ROLES;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as TeamMemberRole)}
      disabled={disabled}
      className="block rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
    >
      {options.map((r) => (
        <option key={r} value={r}>
          {getRoleLabel(r)}
        </option>
      ))}
    </select>
  );
}
