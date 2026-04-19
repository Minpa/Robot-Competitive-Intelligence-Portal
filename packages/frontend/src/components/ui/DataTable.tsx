import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
  mono?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  dense?: boolean;
  className?: string;
  emptyMessage?: string;
}

const ALIGN: Record<NonNullable<DataTableColumn<unknown>['align']>, string> = {
  left:   'text-left',
  right:  'text-right',
  center: 'text-center',
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  dense = false,
  className,
  emptyMessage = '데이터 없음',
}: DataTableProps<T>) {
  const cellPad = dense ? 'px-3 py-2' : 'px-4 py-2.5';

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-ink-300">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'font-mono text-[10px] font-semibold text-ink-500 uppercase tracking-[0.18em] whitespace-nowrap',
                  cellPad,
                  col.align ? ALIGN[col.align] : 'text-left'
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className={cn(
                  'text-center text-[12px] text-ink-400',
                  dense ? 'py-6' : 'py-10'
                )}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIdx) => (
              <tr
                key={getRowKey(row, rowIdx)}
                className="border-b border-ink-100 hover:bg-ink-50/60 transition-colors"
              >
                {columns.map((col) => {
                  const content = col.render
                    ? col.render(row, rowIdx)
                    : (row as any)[col.key];
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        'text-[12.5px] text-ink-800 align-top',
                        cellPad,
                        col.align ? ALIGN[col.align] : 'text-left',
                        col.mono && 'font-mono tracking-tight'
                      )}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
