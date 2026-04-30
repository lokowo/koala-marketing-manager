interface KoalaAvatarProps {
  size?: number;
  bg?: string;
  className?: string;
}

export function KoalaAvatar({ size = 32, bg = '#1a2332', className }: KoalaAvatarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
    >
      {/* Background circle */}
      <circle cx="20" cy="20" r="20" fill={bg} />
      {/* Left outer ear */}
      <circle cx="8" cy="9" r="7" fill={bg} />
      <circle cx="8" cy="9" r="5" fill="#c4a050" opacity="0.25" />
      <circle cx="8" cy="9" r="3" fill="#c4a050" opacity="0.45" />
      {/* Right outer ear */}
      <circle cx="32" cy="9" r="7" fill={bg} />
      <circle cx="32" cy="9" r="5" fill="#c4a050" opacity="0.25" />
      <circle cx="32" cy="9" r="3" fill="#c4a050" opacity="0.45" />
      {/* Face */}
      <circle cx="20" cy="22" r="13" fill="#f5e8c4" />
      {/* Eyes */}
      <ellipse cx="15.5" cy="19.5" rx="2" ry="2.2" fill="#1a2332" />
      <ellipse cx="24.5" cy="19.5" rx="2" ry="2.2" fill="#1a2332" />
      {/* Eye shine */}
      <circle cx="16.3" cy="18.6" r="0.65" fill="white" />
      <circle cx="25.3" cy="18.6" r="0.65" fill="white" />
      {/* Nose */}
      <ellipse cx="20" cy="24.5" rx="4.5" ry="3.2" fill="#1a2332" opacity="0.7" />
      <ellipse cx="18.5" cy="23.5" rx="1.1" ry="0.8" fill="white" opacity="0.45" />
      {/* Smile */}
      <path d="M16.5 27.5 Q20 29.5 23.5 27.5" stroke="#1a2332" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  );
}

interface UserAvatarProps {
  name?: string | null;
  size?: number;
}

export function UserAvatar({ name, size = 28 }: UserAvatarProps) {
  const initials = name
    ? name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';
  const fontSize = size * 0.38;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#1a2332',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize,
        fontWeight: 700,
        color: '#c4a050',
        letterSpacing: '0.02em',
      }}
    >
      {initials}
    </div>
  );
}
