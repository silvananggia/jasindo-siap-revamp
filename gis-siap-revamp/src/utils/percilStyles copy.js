import { Fill, Stroke, Style } from 'ol/style';

export const getPercilStyle = (selection) => (feature) => {
  const id = feature.get('id');
  const isSelected = selection.some((p) => p.id === id);
  return new Style({
    stroke: new Stroke({
      color: isSelected ? '#00FF00' : '#FF5733',
      width: 2,
    }),
    fill: new Fill({
      color: isSelected
        ? 'rgba(0, 255, 0, 0.3)'
        : 'rgba(255, 87, 51, 0.3)',
    }),
  });
}; 