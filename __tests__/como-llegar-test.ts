import { urlsParaLlegar } from '@/utilidades/comoLlegar';

const destino = { latitud: -32.48525, longitud: -58.2372 };

describe('urlsParaLlegar', () => {
  it('Android a pie: navegación de Google Maps en modo "w" y, de respaldo, la web', () => {
    expect(urlsParaLlegar(destino, 'a-pie', 'android')).toEqual([
      'google.navigation:q=-32.48525,-58.2372&mode=w',
      'https://www.google.com/maps/dir/?api=1&destination=-32.48525,-58.2372&travelmode=walking',
    ]);
  });

  it('Android en auto: modo "d" y travelmode driving', () => {
    const urls = urlsParaLlegar(destino, 'en-auto', 'android');
    expect(urls[0]).toBe('google.navigation:q=-32.48525,-58.2372&mode=d');
    expect(urls[1]).toContain('travelmode=driving');
  });

  it('iPhone: Apple Maps con el medio de transporte en dirflg', () => {
    expect(urlsParaLlegar(destino, 'a-pie', 'ios')).toEqual([
      'https://maps.apple.com/?daddr=-32.48525,-58.2372&dirflg=w',
    ]);
    expect(urlsParaLlegar(destino, 'en-auto', 'ios')).toEqual([
      'https://maps.apple.com/?daddr=-32.48525,-58.2372&dirflg=d',
    ]);
  });

  it('otra plataforma (por ejemplo la web): sólo la página de Google Maps', () => {
    expect(urlsParaLlegar(destino, 'a-pie', 'web')).toEqual([
      'https://www.google.com/maps/dir/?api=1&destination=-32.48525,-58.2372&travelmode=walking',
    ]);
  });
});
