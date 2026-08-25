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
  
  // Unselected: strong cyan (not white) so polygons stay visible on imagery
  let strokeColor = '#00ACC1';
  let fillColor = 'rgba(0, 172, 193, 0.28)';
  let textColor = '#006064';
  let textHalo = '#FFFFFF';
  let strokeWidth = 2;
  
  if (isSelected || isLocked) {
    strokeColor = '#FF5733';
    fillColor = 'rgba(255, 87, 51, 0.35)';
    textColor = '#FFFFFF';
    textHalo = '#000000';
    strokeWidth = 2.5;
  } else if (isLimitReached) {
    strokeColor = '#616161';
    fillColor = 'rgba(97, 97, 97, 0.2)';
    textColor = '#212121';
    textHalo = '#FFFFFF';
    strokeWidth = 1.5;
  }
  
  return new Style({
    stroke: new Stroke({
      color: strokeColor,
      width: strokeWidth,
    }),
    fill: new Fill({
      color: fillColor,
    }),
    text: new Text({
      text: displayPetakId ? displayPetakId.toString() : '',
      font: 'bold 11px Arial, sans-serif',
      fill: new Fill({
        color: textColor,
      }),
      stroke: new Stroke({
        color: textHalo,
        width: 3
      }),
      offsetY: 0,
      textAlign: 'center',
      textBaseline: 'middle'
    })
  });
};
