export const framesToSeconds = (frames: number, activityLevel: number) => {
  return Math.round((activityLevel * frames) / 30);
};

export const secondsToTimeFormat = (seconds: number) => {
  // calculate the number of hours, minutes, and seconds
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  // each part to ensure it has two digits
  const formattedHours = hours.toString().padStart(2, "0");
  const formattedMinutes = minutes.toString().padStart(2, "0");
  const formattedSeconds = remainingSeconds.toString().padStart(2, "0");

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};
