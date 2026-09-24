const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * YYYY-MM-DD of an instant as seen in India. toISOString() gives the UTC date,
 * which is the previous day for anything before 05:30 IST: a job starting at
 * midnight on 1 October would otherwise be recorded as starting 30 September.
 */
export function indiaDate(date: Date) {
  return formatter.format(date);
}
