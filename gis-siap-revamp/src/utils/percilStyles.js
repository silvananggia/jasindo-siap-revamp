import { Fill, Stroke, Style, Text } from 'ol/style';

export const getPercilStyle = (selection, lockedIDs = [], isLimitReached = false) => (feature) => {
  const id = feature.get('psid');
  const properties = feature.getProperties();
  
  // Try different property names that might contain the petak ID
  const possibleIds = [
    properties.petak_id,
    properties.idpetak, // Add idpetak field
    properties.psid,
    properties.kel_id, // This might be the actual petak identifier
    id
  ].filter(Boolean); // Remove undefined values

  // Get the petak_id for display (prioritize petak_id, then idpetak, then psid)
  const displayPetakId = properties.petak_id || properties.idpetak || properties.psid || id;
  
  // Check multiple ID formats for matching, including string conversion
  const isSelected = selection.some((p) => {
    // Check if any of the possible IDs match the selection's ID or petakid
    return possibleIds.includes(p.id) || possibleIds.includes(p.petakid) || 
           possibleIds.includes(p.id?.toString()) || possibleIds.includes(p.petakid?.toString());
  });
  const isLocked = possibleIds.some(possibleId => 
    lockedIDs.includes(possibleId) || lockedIDs.includes(possibleId.toString())
  );
  
  
  let strokeColor = 'rgba(0, 255, 0, 0.3)';  // Green for selected and registered
  let fillColor = 'rgba(0, 255, 0, 0.03)'; // Green fill
  
  if (isSelected || isLocked) {
    strokeColor = '#FF5733'; // Default red
    fillColor = 'rgba(255, 87, 51, 0.1)'; // Default red fill
  } else if (isLimitReached) {
    strokeColor = '#9E9E9E'; // Light gray for unavailable when limit reached
    fillColor = 'rgba(158, 158, 158, 0.05)'; // Very light gray fill
  }
  
  return new Style({
    stroke: new Stroke({
      color: strokeColor,
      width: 1,
    }),
    fill: new Fill({
      color: fillColor,
    }),
    text: new Text({
      text: displayPetakId ? displayPetakId.toString() : '',
      font: '10px Arial, sans-serif',
      fill: new Fill({
        color: '#FFFFFF',
      }),
      stroke: new Stroke({
        color: '#000000',
        width: 1
      }),
      offsetY: 0,
      textAlign: 'center',
      textBaseline: 'middle'
    })
  });
}; 