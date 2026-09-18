import { PageHeader, type PageHeaderProps } from "@/components/layout/PageHeader";

type PageShellProps = PageHeaderProps & {
  children: React.ReactNode;
};

export function PageShell({ children, ...headerProps }: Readonly<PageShellProps>) {
  return (
    <main className="page-shell">
      <PageHeader {...headerProps} />
      <div className="page-content">{children}</div>
    </main>
  );
}
