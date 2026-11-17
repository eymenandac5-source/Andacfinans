interface BrandMarkProps {
  compact?: boolean;
  showSlogan?: boolean;
}

export function BrandMark({ compact = false, showSlogan = false }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3 select-none">
      <div className="w-9 h-9 rounded-xl bg-[#B7F000] flex items-center justify-center shrink-0">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 17.5L10.2 6.5H13.6L19.8 17.5H16.2L14.9 15H9L7.6 17.5H4ZM10.3 12.4H13.6L11.9 9.1L10.3 12.4Z"
            fill="#10120D"
          />
          <path d="M16.5 6.5H20V10" stroke="#10120D" strokeWidth="2.1" strokeLinecap="square" />
        </svg>
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className="font-display font-bold tracking-tight text-white text-base leading-none whitespace-nowrap">
            ANDAÇ FİNANS
          </div>
          {showSlogan && (
            <div className="text-[11px] text-[#A5A99E] mt-1 leading-none whitespace-nowrap">
              Finansın Yeni Yönü.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
