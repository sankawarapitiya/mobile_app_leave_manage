export const formatDate = (dateInput: string | Date | undefined): string => {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput.replace(/-/g, '/')) : dateInput;
  if (isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput : '';
  
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatShortDate = (dateInput: string | Date | undefined): string => {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput.replace(/-/g, '/')) : dateInput;
  if (isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput : '';
  
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateRange = (startDate: string, endDate: string, isHalfDay?: boolean, halfDayPeriod?: string): string => {
  if (!startDate) return '';
  if (startDate === endDate) {
    const formatted = formatDate(startDate);
    if (isHalfDay) {
      return `${formatted} (${halfDayPeriod === 'first_half' ? '1st Half' : '2nd Half'})`;
    }
    return formatted;
  }
  return `${formatShortDate(startDate)} - ${formatDate(endDate)}`;
};

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
};

export const parseISODate = (isoStr: string): Date => {
  const [year, month, day] = isoStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const toISODateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculates working days between two ISO dates (inclusive)
 * Excludes weekends (Sat, Sun) and optional list of holiday ISO date strings.
 */
export const calculateWorkingDays = (
  startDateStr: string,
  endDateStr: string,
  holidayDates: string[] = []
): number => {
  if (!startDateStr || !endDateStr) return 0;
  
  const start = parseISODate(startDateStr);
  const end = parseISODate(endDateStr);
  
  if (start > end) return 0;
  
  let count = 0;
  const current = new Date(start);
  const holidaySet = new Set(holidayDates);

  while (current <= end) {
    const isoCurrent = toISODateString(current);
    if (!isWeekend(current) && !holidaySet.has(isoCurrent)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
};

/**
 * Check if two date ranges overlap
 */
export const checkDateOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean => {
  return !(endA < startB || startA > endB);
};

/**
 * Generates markedDates object for react-native-calendars
 */
export const getMarkedRange = (
  startDate: string | null,
  endDate: string | null,
  primaryColor: string
) => {
  if (!startDate) return {};

  const marked: Record<string, any> = {};

  if (!endDate || startDate === endDate) {
    marked[startDate] = {
      startingDay: true,
      endingDay: true,
      color: primaryColor,
      textColor: '#FFFFFF',
    };
    return marked;
  }

  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  const current = new Date(start);

  while (current <= end) {
    const dateStr = toISODateString(current);
    const isStart = dateStr === startDate;
    const isEnd = dateStr === endDate;

    marked[dateStr] = {
      startingDay: isStart,
      endingDay: isEnd,
      color: isStart || isEnd ? primaryColor : `${primaryColor}22`,
      textColor: isStart || isEnd ? '#FFFFFF' : primaryColor,
    };

    current.setDate(current.getDate() + 1);
  }

  return marked;
};
