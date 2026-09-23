export function PageHeader({ title, intro, actions }: { title: string; intro?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl">{title}</h1>
        {intro ? <p className="mt-2 max-w-2xl text-muted">{intro}</p> : null}
      </div>
      {actions}
    </header>
  );
}
