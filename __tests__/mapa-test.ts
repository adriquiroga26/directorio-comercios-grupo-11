import { REGION_POR_DEFECTO, regionAlrededorDe, regionQueAbarca } from '@/utilidades/mapa';

describe('regionQueAbarca', () => {
  it('sin puntos devuelve la región por defecto', () => {
    expect(regionQueAbarca([])).toEqual(REGION_POR_DEFECTO);
  });

  it('centra la región entre los puntos y deja un margen', () => {
    const region = regionQueAbarca(
      [
        { latitud: -32.48, longitud: -58.24 },
        { latitud: -32.5, longitud: -58.22 },
      ],
      1.5,
    );
    expect(region.latitude).toBeCloseTo(-32.49, 6);
    expect(region.longitude).toBeCloseTo(-58.23, 6);
    expect(region.latitudeDelta).toBeCloseTo(0.03, 6);
    expect(region.longitudeDelta).toBeCloseTo(0.03, 6);
  });

  it('con un solo punto usa el abarque mínimo en vez de un zoom exagerado', () => {
    const region = regionQueAbarca([{ latitud: -32.48, longitud: -58.23 }]);
    expect(region.latitude).toBe(-32.48);
    expect(region.latitudeDelta).toBe(0.006);
    expect(region.longitudeDelta).toBe(0.006);
  });

  it('el abarque de cada eje es independiente', () => {
    const region = regionQueAbarca(
      [
        { latitud: -32.48, longitud: -58.23 },
        { latitud: -32.48, longitud: -58.13 },
      ],
      1,
    );
    expect(region.latitudeDelta).toBe(0.006);
    expect(region.longitudeDelta).toBeCloseTo(0.1, 6);
  });
});

describe('regionAlrededorDe', () => {
  it('centra el mapa en la persona', () => {
    const region = regionAlrededorDe({ latitud: -32.48, longitud: -58.23 });
    expect(region.latitude).toBe(-32.48);
    expect(region.longitude).toBe(-58.23);
    expect(region.latitudeDelta).toBe(0.01);
  });
});
