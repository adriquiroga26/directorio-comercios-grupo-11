import Ionicons from '@react-native-vector-icons/ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { diaDeFecha } from '@/utilidades/fechas';

interface Props {
  etiqueta: string; // por ejemplo "Desde"
  valor: Date;
  onCambio: (fecha: Date) => void;
}

// Un campo que muestra un día y, al tocarlo, abre el calendario del sistema.
// El paquete se usa distinto según la plataforma:
// - Android: el calendario es un cuadro de diálogo, y se abre con una función
//   (`DateTimePickerAndroid.open`), que es lo que recomienda el propio paquete.
// - iPhone: es un componente que se dibuja en pantalla, y acá se muestra o se oculta.
export function SelectorDia({ etiqueta, valor, onCambio }: Props) {
  const theme = useTheme();
  const [abiertoEnIos, setAbiertoEnIos] = useState(false);

  function abrir() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: valor,
        mode: 'date',
        onChange: (evento, fecha) => {
          // 'set' = eligió un día; 'dismissed' = cerró el calendario sin elegir.
          if (evento.type === 'set' && fecha) onCambio(fecha);
        },
      });
    } else {
      setAbiertoEnIos((abierto) => !abierto);
    }
  }

  return (
    <View style={styles.contenedor}>
      <ThemedText type="smallBold">{etiqueta}</ThemedText>
      <Pressable
        onPress={abrir}
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta}: ${diaDeFecha(valor)}. Tocá para cambiarla`}
        style={[styles.campo, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="calendar-outline" size={18} color={theme.text} />
        <ThemedText>{diaDeFecha(valor)}</ThemedText>
      </Pressable>

      {abiertoEnIos && (
        <DateTimePicker
          value={valor}
          mode="date"
          display="inline"
          onChange={(_evento, fecha) => {
            if (fecha) onCambio(fecha);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: Spacing.one,
  },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
