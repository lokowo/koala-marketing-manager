interface KoalaAvatarProps {
  size?: number;
  className?: string;
}

export function KoalaAvatar({ size = 32, className }: KoalaAvatarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id="koalaBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a2a20" />
          <stop offset="100%" stopColor="#0d1a14" />
        </linearGradient>
      </defs>
      {/* Background circle */}
      <circle cx="20" cy="20" r="20" fill="url(#koalaBg)" />
      {/* Left ear */}
      <circle cx="9" cy="10" r="7.5" fill="#3a4a4e" />
      <circle cx="9" cy="10" r="4.5" fill="rgba(212,168,67,0.3)" />
      {/* Right ear */}
      <circle cx="31" cy="10" r="7.5" fill="#3a4a4e" />
      <circle cx="31" cy="10" r="4.5" fill="rgba(212,168,67,0.3)" />
      {/* Face */}
      <circle cx="20" cy="22" r="12" fill="#f0e8d4" />
      {/* Left eye */}
      <circle cx="15" cy="20" r="1.8" fill="#2a2a2a" />
      <circle cx="15.6" cy="19.2" r="0.6" fill="white" />
      {/* Right eye */}
      <circle cx="25" cy="20" r="1.8" fill="#2a2a2a" />
      <circle cx="25.6" cy="19.2" r="0.6" fill="white" />
      {/* Nose */}
      <ellipse cx="20" cy="24.5" rx="3.8" ry="2.8" fill="#5a4a3a" />
      <ellipse cx="18.8" cy="23.8" rx="0.8" ry="0.5" fill="white" opacity="0.35" />
      {/* Smile */}
      <path d="M17 27.5 Q20 29.5 23 27.5" stroke="#5a4a3a" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  );
}

interface UserAvatarProps {
  name?: string | null;
  size?: number;
  avatarUrl?: string | null;
}

export function UserAvatar({ name, size = 28, avatarUrl }: UserAvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'User'}
        style={{ width: size, height: size, objectFit: 'cover' }}
        className="rounded-full flex-shrink-0"
      />
    );
  }

  const initials = name
    ? name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';
  const fontSize = size * 0.38;
  return (
    <div
      style={{ width: size, height: size, fontSize, flexShrink: 0 }}
      className="rounded-full bg-[#D4A843] flex items-center justify-center font-bold text-[#080c10] tracking-[0.02em]"
    >
      {initials}
    </div>
  );
}
