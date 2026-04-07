
export const getContainScale = (sourceWidth, sourceHeight, targetWidth, targetHeight) => {
  if (!sourceWidth || !sourceHeight) {
    return 1;
  }

  return Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight, 1);
};

export const getCoverScale = (sourceWidth, sourceHeight, targetWidth, targetHeight) => {
  if (!sourceWidth || !sourceHeight) {
    return 1;
  }

  return Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
};
