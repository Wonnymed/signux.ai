export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-12">{children}</div>
    </div>
  );
}
