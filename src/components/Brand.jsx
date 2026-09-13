export const FARM_NAME = 'Bharat Goat Farm'
export const FARM_LOCATION = 'Geedgarh'

export default function Brand({ size = 'md' }) {
  const large = size === 'lg'
  return (
    <div className={`flex items-center ${large ? 'flex-col gap-3 text-center' : 'gap-2.5'}`}>
      <div
        className={`flex shrink-0 items-center justify-center rounded-xl bg-primary font-heading font-bold text-white ${
          large ? 'h-14 w-14 text-xl' : 'h-9 w-9 text-sm'
        }`}
        aria-hidden="true"
      >
        BG
      </div>
      <div className="min-w-0">
        <p className={`truncate font-heading font-semibold text-foreground ${large ? 'text-2xl' : 'text-sm'}`}>{FARM_NAME}</p>
        <p className={`truncate text-muted-foreground ${large ? 'mt-0.5 text-sm' : 'text-xs'}`}>{FARM_LOCATION}</p>
      </div>
    </div>
  )
}
