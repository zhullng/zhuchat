export function formatMessageTime(date) {
  return new Date(date).toLocaleTimeString("pt-PT", {
    hour: "2-digit", 
    minute: "2-digit",
    hour12: false, 
  });
}
