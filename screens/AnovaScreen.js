import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Cálculos ANOVA de un Factor ─────────────────────────────────────────────

function parseArray(str) {
  return str
    .split(/[,\s]+/)
    .map((s) => parseFloat(s.trim()))
    .filter((n) => !isNaN(n));
}

function calcANOVA(groups) {
  const k = groups.length;
  const ns = groups.map((g) => g.length);
  const N = ns.reduce((a, b) => a + b, 0);

  const means = groups.map((g) => g.reduce((a, b) => a + b, 0) / g.length);
  const grandMean = groups.flat().reduce((a, b) => a + b, 0) / N;

  // Suma de cuadrados entre grupos (SSB)
  const SSB = ns.reduce((acc, n, i) => acc + n * Math.pow(means[i] - grandMean, 2), 0);
  // Suma de cuadrados dentro (SSW / SSE)
  const SSW = groups.reduce((acc, g, i) => {
    return acc + g.reduce((a, x) => a + Math.pow(x - means[i], 2), 0);
  }, 0);
  const SST = SSB + SSW;

  const dfB = k - 1;       // grados de libertad entre
  const dfW = N - k;       // grados de libertad dentro
  const dfT = N - 1;       // total

  const MSB = SSB / dfB;   // media cuadrática entre
  const MSW = SSW / dfW;   // media cuadrática dentro
  const F = MSB / MSW;

  return { SSB, SSW, SST, dfB, dfW, dfT, MSB, MSW, F, grandMean, means, ns, N, k };
}

function fmt(n, d = 4) {
  return isFinite(n) ? n.toFixed(d) : '—';
}

// ─── Componente Tabla ANOVA ───────────────────────────────────────────────────

function AnovaTable({ result }) {
  if (!result) return null;
  const { SSB, SSW, SST, dfB, dfW, dfT, MSB, MSW, F } = result;

  const rows = [
    { fuente: 'Entre grupos', SS: SSB, df: dfB, MS: MSB, F: F },
    { fuente: 'Dentro grupos', SS: SSW, df: dfW, MS: MSW, F: null },
    { fuente: 'Total', SS: SST, df: dfT, MS: null, F: null },
  ];

  return (
    <View style={styles.tableWrapper}>
      <Text style={styles.sectionTitle}>📋 Tabla ANOVA</Text>

      {/* Estadísticos descriptivos */}
      <View style={styles.statsBox}>
        <Text style={styles.statsTitle}>Estadísticos por grupo</Text>
        {result.means.map((mean, i) => (
          <Text key={i} style={styles.statsRow}>
            Grupo {i + 1}: n={result.ns[i]}  x̄={fmt(mean, 4)}
          </Text>
        ))}
        <Text style={styles.statsRow}>Media global: x̄̄ = {fmt(result.grandMean, 4)}</Text>
        <Text style={styles.statsRow}>N total = {result.N}  |  k grupos = {result.k}</Text>
      </View>

      {/* Tabla */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Encabezado */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            {['Fuente', 'SC', 'gl', 'CM', 'F calc'].map((h) => (
              <Text key={h} style={[styles.tableCell, styles.tableCellHeader]}>
                {h}
              </Text>
            ))}
          </View>
          {/* Filas */}
          {rows.map((row, idx) => (
            <View
              key={idx}
              style={[
                styles.tableRow,
                idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                idx === rows.length - 1 ? styles.tableRowTotal : undefined,
              ]}
            >
              <Text style={[styles.tableCell, styles.tableCellLabel]}>{row.fuente}</Text>
              <Text style={styles.tableCell}>{fmt(row.SS)}</Text>
              <Text style={styles.tableCell}>{row.df}</Text>
              <Text style={styles.tableCell}>{row.MS != null ? fmt(row.MS) : '—'}</Text>
              <Text style={[styles.tableCell, row.F != null ? styles.fValue : undefined]}>
                {row.F != null ? fmt(row.F) : '—'}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Veredicto F */}
      <View style={styles.verdictBox}>
        <Text style={styles.verdictText}>
          F calculado = <Text style={styles.verdictValue}>{fmt(F)}</Text>
        </Text>
        <Text style={styles.verdictHint}>
          Compare con F crítico (α=0.05, gl₁={dfB}, gl₂={dfW}) en tablas estadísticas.
        </Text>
      </View>
    </View>
  );
}

// ─── Pantalla Principal ───────────────────────────────────────────────────────

export default function AnovaScreen() {
  const [g1, setG1] = useState('3.30, 3.42, 3.36, 3.34');
  const [g2, setG2] = useState('3.25, 3.15, 3.30, 3.20');
  const [g3, setG3] = useState('3.10, 3.25, 3.18, 3.12');
  const [result, setResult] = useState(null);

  function handleCalcular() {
    const groups = [parseArray(g1), parseArray(g2), parseArray(g3)];
    if (groups.some((g) => g.length < 2)) {
      Alert.alert('Error', 'Cada grupo debe tener al menos 2 valores numéricos.');
      return;
    }
    setResult(calcANOVA(groups));
  }

  function handleLimpiar() {
    setG1('');
    setG2('');
    setG3('');
    setResult(null);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cabecera */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ANOVA de un Factor</Text>
          <Text style={styles.headerSub}>
            Ingrese los datos de cada arquitectura separados por comas o espacios
          </Text>
        </View>

        {/* Contexto del problema */}
        <View style={styles.contextBox}>
          <Text style={styles.contextTitle}>📌 Contexto — Parte I</Text>
          <Text style={styles.contextText}>
            Banco de Venezuela evalúa latencia (s) de tres arquitecturas:{'\n'}
            SwiftVen (1), SwiftFast (2) y SwiftPay (3){'\n'}
            σ = 0.18 seg  |  α = 0.05
          </Text>
        </View>

        {/* Formulario */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos de entrada</Text>

          {[
            { label: 'Arquitectura 1 — SwiftVen', value: g1, setter: setG1 },
            { label: 'Arquitectura 2 — SwiftFast', value: g2, setter: setG2 },
            { label: 'Arquitectura 3 — SwiftPay', value: g3, setter: setG3 },
          ].map(({ label, value, setter }) => (
            <View key={label} style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{label}</Text>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={setter}
                placeholder="ej: 3.30, 3.42, 3.36, 3.34"
                placeholderTextColor="#90A4AE"
                keyboardType="default"
                multiline
              />
            </View>
          ))}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleCalcular}>
              <Text style={styles.btnPrimaryText}>📊 Calcular ANOVA</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleLimpiar}>
              <Text style={styles.btnSecondaryText}>Limpiar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabla de resultados */}
        {result && <AnovaTable result={result} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  container: { padding: 16, paddingBottom: 32 },

  header: { marginBottom: 12 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1565C0',
    letterSpacing: 0.3,
  },
  headerSub: { fontSize: 13, color: '#607D8B', marginTop: 4 },

  contextBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#1565C0',
  },
  contextTitle: { fontWeight: '700', color: '#0D47A1', marginBottom: 4, fontSize: 13 },
  contextText: { fontSize: 12, color: '#37474F', lineHeight: 18 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#263238',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
    paddingBottom: 8,
  },

  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#455A64', marginBottom: 6 },
  input: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1.5,
    borderColor: '#B0BEC5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#263238',
    minHeight: 44,
  },

  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  btnPrimary: {
    flex: 2,
    backgroundColor: '#1565C0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 2,
  },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#ECEFF1',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSecondaryText: { color: '#546E7A', fontWeight: '600', fontSize: 14 },

  // Tabla
  tableWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1565C0',
    marginBottom: 12,
  },

  statsBox: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  statsTitle: { fontWeight: '700', color: '#455A64', fontSize: 13, marginBottom: 6 },
  statsRow: { fontSize: 13, color: '#37474F', lineHeight: 20 },

  tableRow: {
    flexDirection: 'row',
    minWidth: 360,
  },
  tableHeader: {
    backgroundColor: '#1565C0',
    borderRadius: 6,
    marginBottom: 2,
  },
  tableRowEven: { backgroundColor: '#F5F7FA' },
  tableRowOdd: { backgroundColor: '#FFFFFF' },
  tableRowTotal: {
    backgroundColor: '#E3F2FD',
    borderTopWidth: 1.5,
    borderTopColor: '#1565C0',
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    color: '#37474F',
    paddingVertical: 9,
    paddingHorizontal: 6,
    textAlign: 'center',
    minWidth: 70,
  },
  tableCellHeader: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  tableCellLabel: {
    fontWeight: '600',
    color: '#263238',
    textAlign: 'left',
    paddingLeft: 10,
    minWidth: 110,
  },
  fValue: { color: '#C62828', fontWeight: '700' },

  verdictBox: {
    marginTop: 14,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F9A825',
  },
  verdictText: { fontSize: 14, fontWeight: '600', color: '#37474F' },
  verdictValue: { color: '#C62828', fontWeight: '800' },
  verdictHint: { fontSize: 11, color: '#78909C', marginTop: 4 },
});
