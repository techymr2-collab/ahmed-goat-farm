import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_COLORS, axisProps, gridProps, ChartTooltip } from './charts'
import { formatDate, formatNumber, parseDate } from '../lib/format'

const TICK_FORMAT = new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' })

/** Single-series growth line for one goat. `records` must be sorted oldest first. */
export default function WeightChart({ records, height = 256 }) {
  const data = records.map((r) => ({ date: r.record_date, weight: Number(r.weight_kg) }))
  const latest = data[data.length - 1]
  const first = data[0]

  return (
    <div
      style={{ height }}
      className="w-full"
      role="img"
      aria-label={
        latest
          ? `Weight grew from ${formatNumber(first.weight)} kg on ${formatDate(first.date)} to ${formatNumber(latest.weight)} kg on ${formatDate(latest.date)}.`
          : 'No weight records'
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="date"
            {...axisProps}
            tickFormatter={(d) => TICK_FORMAT.format(parseDate(d))}
            minTickGap={24}
          />
          <YAxis {...axisProps} width={48} tickFormatter={(v) => `${v} kg`} domain={[0, 'auto']} />
          <Tooltip
            cursor={{ stroke: CHART_COLORS.grid, strokeWidth: 1 }}
            content={<ChartTooltip labelFormatter={formatDate} formatValue={(v) => `${formatNumber(v)} kg`} />}
          />
          <Line
            type="monotone"
            dataKey="weight"
            name="Weight"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={{ r: 4, fill: CHART_COLORS.primary, stroke: '#ffffff', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: CHART_COLORS.primary, stroke: '#ffffff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
