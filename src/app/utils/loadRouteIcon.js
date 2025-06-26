const loadRouteIcon = (routeNumber, callback) => {
  const imageUrl = `/icons/Linie_${routeNumber}_Pikto.gif`;
  const fallbackUrl = '/icons/tram_logo.png';

  const img = new Image();

  img.onload = () => callback(imageUrl);
  img.onerror = () => {
    // Try to load the fallback image
    const fallbackImg = new Image();
    fallbackImg.onload = () => callback(fallbackUrl);
    fallbackImg.onerror = () => {
      console.error('Both primary and fallback route icons failed to load.');
      callback(null); // or fallbackUrl again, or a placeholder
    };
    fallbackImg.src = fallbackUrl;
  };

  img.src = imageUrl;
};

export default loadRouteIcon;