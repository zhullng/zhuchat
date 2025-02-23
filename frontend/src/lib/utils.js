export function formatMessageTime(date) {
  return new Date(date).toLocaleTimeString("pt-PT", {
    hour: "2-digit", 
    minute: "2-digit",
    hour12: false, 
  });
}

export function formatMessageDate(date) {
  return new Date(date).toLocaleDateString("pt-PT", {
    day: "2-digit",  // Day in 2-digit format
    month: "long",   // Full month name (e.g., "fevereiro")
    year: "numeric", // Include the full year (e.g., "2025")
  });
}
