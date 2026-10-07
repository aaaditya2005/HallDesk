/**
 * Calculate and format time remaining until expiration
 * @param {number} timeRemainingMs - Time remaining in milliseconds
 * @returns {object} - Object with formatted string and remaining ms
 */
export const formatTimeRemaining = (timeRemainingMs) => {
  if (!timeRemainingMs || timeRemainingMs <= 0) {
    return {
      formatted: "Expired",
      isExpired: true,
      ms: 0,
      days: 0,
      hours: 0,
      minutes: 0,
    };
  }

  const totalSeconds = Math.floor(timeRemainingMs / 1000);
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);

  const formatted = days > 0
    ? `${days} day${days > 1 ? "s" : ""} remaining`
    : hours > 0
      ? `${hours} hour${hours > 1 ? "s" : ""} remaining`
      : minutes > 0
        ? `${minutes} minute${minutes > 1 ? "s" : ""} remaining`
        : "Expiring soon";

  return {
    formatted,
    isExpired: false,
    ms: timeRemainingMs,
    days,
    hours,
    minutes,
  };
};

/**
 * Get color badge class based on time remaining
 * @param {number} timeRemainingMs - Time remaining in milliseconds
 * @returns {string} - Bootstrap badge class
 */
export const getTimeRemainingBadgeClass = (timeRemainingMs) => {
  if (!timeRemainingMs || timeRemainingMs <= 0) {
    return "bg-danger"; // Expired
  }

  const days = Math.floor(timeRemainingMs / (24 * 60 * 60 * 1000));

  if (days <= 1) {
    return "bg-warning"; // Less than 1 day
  } else if (days <= 3) {
    return "bg-info"; // 1-3 days
  } else {
    return "bg-success"; // More than 3 days
  }
};
