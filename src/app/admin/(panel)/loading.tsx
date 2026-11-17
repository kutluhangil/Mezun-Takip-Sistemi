/** Menüden tıklanınca anında görünen kâğıt iskelet; veri gelince yerini sayfaya bırakır. */
export default function AdminLoading() {
  const bar = 'rounded-lg bg-sunk animate-pulse'
  return (
    <div aria-busy="true" className="pt-10 sm:pt-14">
      <div className={`${bar} h-4 w-40`} />
      <div className={`${bar} mt-4 h-10 w-72 max-w-full`} />
      <div className={`${bar} mt-3 h-4 w-[28rem] max-w-full`} />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className={`${bar} h-28 rounded-2xl`} />)}
      </div>
      <div className={`${bar} mt-6 h-64 rounded-2xl`} />
    </div>
  )
}
