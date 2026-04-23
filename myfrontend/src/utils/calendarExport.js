/**
 * Genera un link per aggiungere un evento a Google Calendar
 */
export const generateGoogleCalendarLink = (event, option) => {
  const baseUrl = 'https://calendar.google.com/calendar/render';
  
  // Formatta le date per Google Calendar (formato: YYYYMMDDTHHmmssZ)
  const formatDate = (date) => {
    return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDate(option.start)}/${formatDate(option.end)}`,
    details: event.description || '',
    // location: event.location || '',  // Se hai un campo location
  });
  
  return `${baseUrl}?${params.toString()}`;
};

/**
 * Genera link per Outlook Calendar
 */
export const generateOutlookCalendarLink = (event, option) => {
  const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';
  
  const params = new URLSearchParams({
    subject: event.title,
    startdt: new Date(option.start).toISOString(),
    enddt: new Date(option.end).toISOString(),
    body: event.description || '',
    path: '/calendar/action/compose',
    rru: 'addevent',
  });
  
  return `${baseUrl}?${params.toString()}`;
};

/**
 * Genera link per Yahoo Calendar
 */
export const generateYahooCalendarLink = (event, option) => {
  const baseUrl = 'https://calendar.yahoo.com/';
  
  const formatDate = (date) => {
    return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  
  const params = new URLSearchParams({
    v: '60',
    title: event.title,
    st: formatDate(option.start),
    et: formatDate(option.end),
    desc: event.description || '',
  });
  
  return `${baseUrl}?${params.toString()}`;
};