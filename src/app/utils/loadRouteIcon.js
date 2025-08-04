const loadRouteIcon = (routeNumber, callback) => {
  // Use a more concise way to handle route number mapping
  const mappedRouteNumber = {
    '101': '1',
    '102': '2',
  }[routeNumber] || routeNumber;

  const imageUrl = `/icons/Linie_${mappedRouteNumber}_Pikto.gif`;
  const fallbackUrl = '/icons/tram_logo.png';

  const img = new Image();

  img.onload = () => callback(imageUrl);
  img.onerror = () => {
    // Try to load the fallback image
    const fallbackImg = new Image();
    fallbackImg.onload = () => callback(fallbackUrl);
    fallbackImg.onerror = () => {
      console.error(
        'Both primary and fallback route icons failed to load.'
      );
      callback(null); // It's often good to provide null or a specific error state
    };
    fallbackImg.src = fallbackUrl;
  };

  img.src = imageUrl;
};

export default loadRouteIcon;