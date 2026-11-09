import Ionicons from '@react-native-vector-icons/ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fechaDeHora, horaDeFecha } from '@/utilidades/edicionHorarios';

interface Props {
  etiqueta: string; // por ejemplo "Abre"
  valor: string; // "08:30"
  onCambio: (hora: string) => void;
}

// Un campo que muestra una hora y, al tocarlo, abre el reloj del sistema. Igual que
// SelectorDia, se usa distinto según la plataforma: en Android es un cuadro de diálogo
// (`DateTimePickerAndroid.open`) y en iPhone es un componente que se muestra o se oculta.
// Trabaja con texto "HH:MM" (el formato de la API) y lo convierte a Date sólo por dentro.
export function SelectorHora({ etiqueta, valor, onCambio }: Props) {
  const theme = useTheme();
  const [abiertoEnIos, setAbiertoEnIos] = useState(false);

  function abrir() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: fechaDeHora(valor),
        mode: 'time',
        is24Hour: true,
        onChange: (evento, fecha) => {
          // 'set' = eligió una hora; 'dismissed' = cerró el reloj sin elegir.
          if (evento.type === 'set' && fecha) onCambio(horaDeFecha(fecha));
        },
      });
    } else {
      setAbiertoEnIos((abierto) => !abierto);
    }
  }

  return (
    <View style={styles.contenedor}>
      <ThemedText type="small" themeColor="textSecondary">
        {etiqueta}
      </ThemedText>
      <Pressable
        onPress={abrir}
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta}: ${valor}. Tocá para cambiarla`}
        style={[styles.campo, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="time-outline" size={18} color={theme.text} />
        <ThemedText>{valor}</ThemedText>
      </Pressable>

      {abiertoEnIos && (
        <DateTimePicker
          value={fechaDeHora(valor)}
          mode="time"
          display="spinner"
          is24Hour
          onChange={(_evento, fecha) => {
            if (fecha) onCambio(horaDeFecha(fecha));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
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
