import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Datos del proyecto (20 observaciones de la tabla del examen) ─────────────

const DATOS_EJEMPLO = [
  { y: 9.8, x1: 3.3, x2: 2.8, x3: 3.1, x4: 4.1 },
  { y: 12.6, x1: 4.6, x2: 4.9, x3: 3.5, x4: 3.9 },
  { y: 11.9, x1: 3.9, x2: 5.3, x3: 4.8, x4: 4.7 },
  { y: 13.1, x1: 5.9, x2: 2.6, x3: 3.1, x4: 3.6 },
  { y: 13.3, x1: 4.6, x2: 5.1, x3: 5.0, x4: 4.1 },
  { y: 13.5, x1: 5.2, x2: 3.2, x3: 3.3, x4: 4.3 },
  { y: 10.1, x1: 4.0, x2: 4.0, x3: 3.3, x4: 4.0 },
  { y: 13.1, x1: 4.7, x2: 4.5, x3: 3.5, x4: 3.8 },
  { y: 10.7, x1: 4.5, x2: 4.1, x3: 3.7, x4: 3.6 },
  { y: 11.0, x1: 3.7, x2: 3.6, x3: 3.3, x4: 3.6 },
  { y: 13.0, x1: 4.6, x2: 4.6, x3: 3.6, x4: 3.6 },
  { y: 11.6, x1: 4.7, x2: 3.5, x3: 3.5, x4: 3.7 },
  { y: 12.0, x1: 3.9, x2: 4.6, x3: 3.6, x4: 4.1 },
  { y: 11.4, x1: 4.6, x2: 4.0, x3: 3.3, x4: 3.6 },
  { y: 12.2, x1: 5.1, x2: 3.6, x3: 3.3, x4: 4.0 },
  { y: 12.8, x1: 5.0, x2: 4.4, x3: 3.6, x4: 3.7 },
  { y: 12.4, x1: 4.8, x2: 4.4, x3: 3.4, x4: 3.6 },
  { y: 13.2, x1: 5.3, x2: 3.5, x3: 3.6, x4: 3.7 },
  { y: 10.6, x1: 3.9, x2: 3.8, x3: 3.4, x4: 4.0 },
  { y: 7.9, x1: 3.4, x2: 3.8, x3: 3.4, x4: 3.4 },
];

// ─── Cálculos RLM (Mínimos Cuadrados) usando álgebra matricial JavaScript ────

function transponer(A) {
  return A[0].map((_, j) => A.map((row) => row[j]));
}

function multiplicar(A, B) {
  return A.map((rowA) =>
    B[0].map((_, j) => rowA.reduce((sum, val, k) => sum + val * B[k][j], 0))
  );
}

function invertir3x3(m) {
  // Eliminación Gauss-Jordan para matriz p×p
  const n = m.length;
  const aug = m.map((row, i) => {
    const identity = Array(n).fill(0);
    identity[i] = 1;
    return [...row, ...identity];
  });

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) return null;
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }
  return aug.map((row) => row.slice(n));
}

function calcRLM(data, predictors) {
  // Construir matriz X y vector y
  const n = data.length;
  const X = data.map((row) => [1, ...predictors.map((p) => row[p])]);
  const Y = data.map((row) => [row.y]);

  const Xt = transponer(X);
  const XtX = multiplicar(Xt, X);
  const XtXinv = invertir3x3(XtX);
  if (!XtXinv) return null;

  const XtY = multiplicar(Xt, Y);
  const beta = multiplicar(XtXinv, XtY).map((r) => r[0]);

  // Valores ajustados y residuos
  const yMean = Y.reduce((s, r) => s + r[0], 0) / n;
  const yHat = X.map((row) => row.reduce((s, v, j) => s + v * beta[j], 0));
  const residuals = Y.map((r, i) => r[0] - yHat[i]);

  const SSE = residuals.reduce((s, e) => s + e * e, 0);
  const SST = Y.reduce((s, r) => s + Math.pow(r[0] - yMean, 2), 0);
  const SSR = SST - SSE;
  const p = predictors.length;
  const dfR = p;
  const dfE = n - p - 1;
  const dfT = n - 1;
  const MSR = SSR / dfR;
  const MSE = SSE / dfE;
  const F = MSR / MSE;
  const R2 = SSR / SST;
  const R2adj = 1 - (1 - R2) * ((n - 1) / (n - p - 1));
  const s2 = MSE;

  // Error estándar de coeficientes
  const seBeta = XtXinv.map((row, i) => Math.sqrt(Math.abs(row[i] * s2)));

  return {
    beta,
    seBeta,
    SSR,
    SSE,
    SST,
    dfR,
    dfE,
    dfT,
    MSR,
    MSE,
    F,
    R2,
    R2adj,
    n,
    p,
    yMean,
    yHat,
    residuals,
    predictors,
  };
}

function fmt(n, d = 4) {
  return n != null && isFinite(n) ? n.toFixed(d) : '—';
}

// ─── Tabla ANOVA de la Regresión ──────────────────────────────────────────────

function AnovaRLMTable({ res }) {
  const rows = [
    { f: 'Regresión', SS: res.SSR, df: res.dfR, MS: res.MSR, F: res.F },
    { f: 'Error', SS: res.SSE, df: res.dfE, MS: res.MSE, F: null },
    { f: 'Total', SS: res.SST, df: res.dfT, MS: null, F: null },
  ];
  return (
    <View style={styles.subCard}>
      <Text style={styles.subCardTitle}>📋 ANOVA de la Regresión</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[styles.tRow, styles.tHeader]}>
            {['Fuente', 'SC', 'gl', 'CM', 'F'].map((h) => (
              <Text key={h} style={[styles.tCell, styles.tCellHead]}>{h}</Text>
            ))}
          </View>
          {rows.map((row, idx) => (
            <View key={idx} style={[styles.tRow, idx % 2 === 0 ? styles.tRowEven : styles.tRowOdd]}>
              <Text style={[styles.tCell, styles.tCellLabel]}>{row.f}</Text>
              <Text style={styles.tCell}>{fmt(row.SS)}</Text>
              <Text style={styles.tCell}>{row.df}</Text>
              <Text style={styles.tCell}>{row.MS != null ? fmt(row.MS) : '—'}</Text>
              <Text style={[styles.tCell, row.F != null ? styles.fVal : undefined]}>
                {row.F != null ? fmt(row.F) : '—'}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Pantalla Principal ───────────────────────────────────────────────────────

export default function RegressionScreen() {
  const [data, setData] = useState(
    DATOS_EJEMPLO.map((r) => ({ ...r })).map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v)]))
    )
  );
  const [useX1, setUseX1] = useState(true);
  const [useX2, setUseX2] = useState(true);
  const [useX3, setUseX3] = useState(true);
  const [useX4, setUseX4] = useState(true);
  const [result, setResult] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [predValues, setPredValues] = useState({ x1: '5.1', x2: '4.7', x3: '4.8', x4: '4.0' });
  const [prediction, setPrediction] = useState(null);

  function updateCell(rowIdx, key, val) {
    setData((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [key]: val };
      return next;
    });
    setResult(null);
  }

  function handleCalc() {
    const parsed = data.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, parseFloat(v)])
      )
    );
    if (parsed.some((r) => Object.values(r).some(isNaN))) {
      Alert.alert('Error', 'Todos los valores deben ser numéricos.');
      return;
    }
    const preds = ['x1', 'x2', 'x3', 'x4'].filter(
      (p, i) => [useX1, useX2, useX3, useX4][i]
    );
    if (preds.length === 0) {
      Alert.alert('Error', 'Seleccione al menos un predictor.');
      return;
    }
    const r = calcRLM(parsed, preds);
    if (!r) {
      Alert.alert('Error', 'No se pudo invertir la matriz (datos colineales).');
      return;
    }
    setResult(r);
    setPrediction(null);
  }

  function handlePredecir() {
    if (!result) { Alert.alert('Atencion', 'Primero calcule el modelo.'); return; }
    const vals = result.predictors.map((p) => parseFloat(predValues[p]));
    if (vals.some(isNaN)) {
      Alert.alert('Error', 'Ingrese valores válidos para la predicción.');
      return;
    }
    const yp = result.beta[0] + vals.reduce((s, v, i) => s + result.beta[i + 1] * v, 0);
    setPrediction(yp);
  }

  const headers = ['#', 'y (CPU%)', 'x₁ (pet/s)', 'x₂ (tam)', 'x₃ (lat)', 'x₄ (mem)'];
  const keys = ['y', 'x1', 'x2', 'x3', 'x4'];
  const labelsSwitch = [
    { key: 'x1', label: 'x₁ Peticiones/s', val: useX1, set: setUseX1 },
    { key: 'x2', label: 'x₂ Tamaño trama', val: useX2, set: setUseX2 },
    { key: 'x3', label: 'x₃ Latencia BD', val: useX3, set: setUseX3 },
    { key: 'x4', label: 'x₄ Memoria µsrv', val: useX4, set: setUseX4 },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Cabecera */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Regresión Lineal Múltiple</Text>
          <Text style={styles.headerSub}>
            Uso de CPU (y) en función de x₁, x₂, x₃, x₄ — 20 observaciones
          </Text>
        </View>

        {/* Contexto */}
        <View style={styles.contextBox}>
          <Text style={styles.contextTitle}>📌 Contexto — Parte II</Text>
          <Text style={styles.contextText}>
            SwiftPay:{'\n'}
            y = Uso CPU (%)  |  x₁ = Peticiones/s  |  x₂ = Tamaño trama{'\n'}
            x₃ = Latencia Bóveda  |  x₄ = Consumo Memoria µsrv
          </Text>
        </View>

        {/* Selección de predictores */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Variables predictoras activas</Text>
          {labelsSwitch.map(({ key, label, val, set }) => (
            <View key={key} style={styles.switchRow}>
              <Text style={styles.switchLabel}>{label}</Text>
              <Switch
                value={val}
                onValueChange={(v) => { set(v); setResult(null); }}
                trackColor={{ false: '#CFD8DC', true: '#90CAF9' }}
                thumbColor={val ? '#1565C0' : '#90A4AE'}
              />
            </View>
          ))}
        </View>

        {/* Tabla de datos (editable) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Datos (editables)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              {/* Encabezado */}
              <View style={[styles.tRow, styles.tHeader]}>
                {headers.map((h) => (
                  <Text key={h} style={[styles.tCell, styles.tCellHead, styles.dataCell]}>{h}</Text>
                ))}
              </View>
              {/* Filas editables */}
              {data.map((row, idx) => (
                <View key={idx} style={[styles.tRow, idx % 2 === 0 ? styles.tRowEven : styles.tRowOdd]}>
                  <Text style={[styles.tCell, styles.tCellLabel, styles.dataCell]}>{idx + 1}</Text>
                  {keys.map((k) => (
                    <TextInput
                      key={k}
                      style={[styles.tCell, styles.tCellInput, styles.dataCell]}
                      value={row[k]}
                      onChangeText={(v) => updateCell(idx, k, v)}
                      keyboardType="decimal-pad"
                    />
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Botón calcular */}
        <TouchableOpacity style={styles.btnPrimary} onPress={handleCalc}>
          <Text style={styles.btnPrimaryText}>📈 Calcular Regresión</Text>
        </TouchableOpacity>

        {/* ── RESULTADOS ── */}
        {result && (
          <View style={styles.resultsArea}>

            {/* R² */}
            <View style={[styles.card, styles.r2Card]}>
              <Text style={styles.r2Title}>Bondad de Ajuste</Text>
              <View style={styles.r2Row}>
                <View style={styles.r2Item}>
                  <Text style={styles.r2Value}>{fmt(result.R2, 4)}</Text>
                  <Text style={styles.r2Label}>R²</Text>
                </View>
                <View style={styles.r2Item}>
                  <Text style={styles.r2Value}>{fmt(result.R2adj, 4)}</Text>
                  <Text style={styles.r2Label}>R² ajustado</Text>
                </View>
                <View style={styles.r2Item}>
                  <Text style={styles.r2Value}>{fmt(Math.sqrt(result.MSE), 4)}</Text>
                  <Text style={styles.r2Label}>s (error std)</Text>
                </View>
              </View>
            </View>

            {/* Coeficientes */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Coeficientes estimados (β̂)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={[styles.tRow, styles.tHeader]}>
                    {['Parámetro', 'Estimado', 'Error std', 't calc'].map((h) => (
                      <Text key={h} style={[styles.tCell, styles.tCellHead, styles.coefCell]}>{h}</Text>
                    ))}
                  </View>
                  {result.beta.map((b, i) => {
                    const name = i === 0 ? 'β₀ (intercepto)' : `β${i} (${result.predictors[i - 1]})`;
                    const se = result.seBeta[i];
                    const t = b / se;
                    return (
                      <View key={i} style={[styles.tRow, i % 2 === 0 ? styles.tRowEven : styles.tRowOdd]}>
                        <Text style={[styles.tCell, styles.tCellLabel, styles.coefCell]}>{name}</Text>
                        <Text style={[styles.tCell, styles.coefCell, styles.betaVal]}>{fmt(b)}</Text>
                        <Text style={[styles.tCell, styles.coefCell]}>{fmt(se)}</Text>
                        <Text style={[styles.tCell, styles.coefCell, styles.fVal]}>{fmt(t)}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Modelo */}
            <View style={styles.modelBox}>
              <Text style={styles.modelTitle}>Modelo ajustado ŷ =</Text>
              <Text style={styles.modelEq}>
                {fmt(result.beta[0], 4)}
                {result.predictors.map((p, i) => {
                  const b = result.beta[i + 1];
                  return `  ${b >= 0 ? '+' : ''}  ${fmt(b, 4)}·${p}`;
                }).join('')}
              </Text>
            </View>

            {/* ANOVA RLM */}
            <AnovaRLMTable res={result} />

            {/* Predicción */}
            <View style={styles.card}>
              <TouchableOpacity
                onPress={() => setPredicting(!predicting)}
                style={styles.predToggle}
              >
                <Text style={styles.predToggleText}>
                  {predicting ? '▲' : '▼'} Predecir ŷ para nuevos valores
                </Text>
              </TouchableOpacity>
              {predicting && (
                <View>
                  {result.predictors.map((p) => (
                    <View key={p} style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{p}</Text>
                      <TextInput
                        style={styles.input}
                        value={predValues[p]}
                        onChangeText={(v) => setPredValues((pr) => ({ ...pr, [p]: v }))}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                        placeholderTextColor="#90A4AE"
                      />
                    </View>
                  ))}
                  <TouchableOpacity style={styles.btnPrimary} onPress={handlePredecir}>
                    <Text style={styles.btnPrimaryText}>Obtener ŷ</Text>
                  </TouchableOpacity>
                  {prediction != null && (
                    <View style={styles.predResult}>
                      <Text style={styles.predResultLabel}>ŷ (Uso CPU estimado)</Text>
                      <Text style={styles.predResultValue}>{fmt(prediction, 4)} %</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  container: { padding: 16, paddingBottom: 40 },

  header: { marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1B5E20', letterSpacing: 0.3 },
  headerSub: { fontSize: 13, color: '#607D8B', marginTop: 4 },

  contextBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  contextTitle: { fontWeight: '700', color: '#1B5E20', marginBottom: 4, fontSize: 13 },
  contextText: { fontSize: 12, color: '#37474F', lineHeight: 18 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardTitle: {
    fontSize: 15, fontWeight: '700', color: '#263238',
    marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#ECEFF1', paddingBottom: 8,
  },

  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#F5F7FA',
  },
  switchLabel: { fontSize: 14, color: '#455A64', fontWeight: '500' },

  tRow: { flexDirection: 'row' },
  tHeader: { backgroundColor: '#2E7D32', borderRadius: 6, marginBottom: 2 },
  tRowEven: { backgroundColor: '#F5F7FA' },
  tRowOdd: { backgroundColor: '#FFFFFF' },
  tCell: { fontSize: 12, color: '#37474F', paddingVertical: 7, paddingHorizontal: 5, textAlign: 'center', minWidth: 68 },
  tCellHead: { color: '#FFFFFF', fontWeight: '700', fontSize: 11 },
  tCellLabel: { fontWeight: '600', color: '#263238', textAlign: 'left', paddingLeft: 8, minWidth: 90 },
  tCellInput: { borderBottomWidth: 1, borderBottomColor: '#B0BEC5', color: '#263238', minWidth: 68 },
  dataCell: { minWidth: 70 },
  coefCell: { minWidth: 100 },
  fVal: { color: '#C62828', fontWeight: '700' },
  betaVal: { color: '#1B5E20', fontWeight: '700' },

  subCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },
  subCardTitle: { fontSize: 14, fontWeight: '700', color: '#2E7D32', marginBottom: 10 },

  btnPrimary: {
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
    elevation: 2,
  },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  resultsArea: { marginTop: 4 },

  r2Card: { backgroundColor: '#E8F5E9' },
  r2Title: { fontSize: 14, fontWeight: '700', color: '#1B5E20', marginBottom: 12 },
  r2Row: { flexDirection: 'row', justifyContent: 'space-around' },
  r2Item: { alignItems: 'center' },
  r2Value: { fontSize: 22, fontWeight: '800', color: '#1B5E20' },
  r2Label: { fontSize: 11, color: '#607D8B', marginTop: 2 },

  modelBox: {
    backgroundColor: '#F3E5F5',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#7B1FA2',
  },
  modelTitle: { fontSize: 13, fontWeight: '700', color: '#4A148C', marginBottom: 4 },
  modelEq: { fontSize: 13, color: '#37474F', lineHeight: 22, fontFamily: 'monospace' },

  predToggle: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  predToggleText: { color: '#2E7D32', fontWeight: '600', fontSize: 14 },

  inputGroup: { marginBottom: 10 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#455A64', marginBottom: 4 },
  input: {
    backgroundColor: '#F5F7FA', borderWidth: 1.5, borderColor: '#B0BEC5',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#263238',
  },

  predResult: {
    backgroundColor: '#1B5E20', borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 12,
  },
  predResultLabel: { color: '#A5D6A7', fontSize: 13, marginBottom: 4 },
  predResultValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
});
