"use client";

type Permission = {
  key: string;
  label: string;
};

const DEFAULT_PERMISSIONS: Permission[] = [
  { key: "view", label: "Visualizar" },
  { key: "deploy", label: "Deploy" },
  { key: "restart", label: "Reiniciar" },
];

type Props = {
  permissions: Record<string, boolean>;
  onChange: (perms: Record<string, boolean>) => void;
  disabled?: boolean;
  items?: Permission[];
};

export default function PermissionMatrix({
  permissions,
  onChange,
  disabled,
  items = DEFAULT_PERMISSIONS,
}: Props) {
  const toggle = (key: string) => {
    onChange({ ...permissions, [key]: !permissions[key] });
  };

  return (
    <div className="flex flex-wrap gap-3">
      {items.map(({ key, label }) => (
        <label
          key={key}
          className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none"
        >
          <input
            type="checkbox"
            checked={!!permissions[key]}
            onChange={() => toggle(key)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
          />
          {label}
        </label>
      ))}
    </div>
  );
}
