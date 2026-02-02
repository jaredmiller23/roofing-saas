'use client'

import * as React from 'react'
import { format, isValid } from 'date-fns'
import { CalendarIcon, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DateTimePickerProps {
  value?: string // datetime-local format: YYYY-MM-DDTHH:mm
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Pick date and time',
  disabled = false,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Parse the datetime-local value into Date and time parts
  const parseValue = (val: string | undefined) => {
    if (!val) return { date: undefined, hours: '09', minutes: '00' }

    const date = new Date(val)
    if (!isValid(date)) return { date: undefined, hours: '09', minutes: '00' }

    return {
      date,
      hours: String(date.getHours()).padStart(2, '0'),
      minutes: String(date.getMinutes()).padStart(2, '0'),
    }
  }

  const { date: selectedDate, hours, minutes } = parseValue(value)
  const [timeHours, setTimeHours] = React.useState(hours)
  const [timeMinutes, setTimeMinutes] = React.useState(minutes)

  // Update time state when value changes
  React.useEffect(() => {
    const { hours: h, minutes: m } = parseValue(value)
    setTimeHours(h)
    setTimeMinutes(m)
  }, [value])

  // Build the datetime-local format string
  const buildDateTimeString = (date: Date | undefined, h: string, m: string) => {
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}T${h}:${m}`
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return
    const newValue = buildDateTimeString(date, timeHours, timeMinutes)
    onChange?.(newValue)
  }

  const handleTimeChange = (type: 'hours' | 'minutes', val: string) => {
    // Only allow digits
    const numVal = val.replace(/\D/g, '')

    if (type === 'hours') {
      // Limit to 0-23
      const clamped = Math.min(23, Math.max(0, parseInt(numVal || '0', 10)))
      const formatted = String(clamped).padStart(2, '0')
      setTimeHours(formatted)
      if (selectedDate) {
        onChange?.(buildDateTimeString(selectedDate, formatted, timeMinutes))
      }
    } else {
      // Limit to 0-59
      const clamped = Math.min(59, Math.max(0, parseInt(numVal || '0', 10)))
      const formatted = String(clamped).padStart(2, '0')
      setTimeMinutes(formatted)
      if (selectedDate) {
        onChange?.(buildDateTimeString(selectedDate, timeHours, formatted))
      }
    }
  }

  const displayValue = selectedDate
    ? format(selectedDate, 'PPP') + ` at ${timeHours}:${timeMinutes}`
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !selectedDate && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
        />
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Time:</span>
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={timeHours}
                onChange={(e) => handleTimeChange('hours', e.target.value)}
                onBlur={() => setTimeHours(timeHours.padStart(2, '0'))}
                className="w-10 rounded border border-border bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="HH"
              />
              <span className="text-muted-foreground">:</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={timeMinutes}
                onChange={(e) => handleTimeChange('minutes', e.target.value)}
                onBlur={() => setTimeMinutes(timeMinutes.padStart(2, '0'))}
                className="w-10 rounded border border-border bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="MM"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
