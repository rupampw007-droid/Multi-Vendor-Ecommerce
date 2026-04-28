import React from "react";

interface ProfileIconProps {
  size?: number;
  color?: string;
  className?: string;
}

const ProfileIcon: React.FC<ProfileIconProps> = ({
  size = 24,
  color = "currentColor",
  className,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Profile"
      role="img"
    >
      {/* Head */}
      <circle cx="12" cy="8" r="4" />
      {/* Shoulders / body */}
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
};

export { ProfileIcon };
export default ProfileIcon;