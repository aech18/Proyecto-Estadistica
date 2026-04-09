import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Constantes estadísticas del proyecto ──────────────────────────────────────

const GROUP_NAMES = ['SwiftVen (A1)', 'SwiftFast (A2)', 'SwiftPay (A3)'];
const F_CRIT_005 = {
  '1-6': 5.987,
  '1-7': 5.591,
  '1-8': 5.318,
  '1-9': 5.117,
  '1-10': 4.965,
  '2-6': 5.143,
  '2-7': 4.737,
  '2-8': 4.459,
  '2-9': 4.256,
  '2-10': 4.103,
  '2-12': 3.885,
  '2-15': 3.682,
  '2-20': 3.493,
  '2-24': 3.403,
  '2-30': 3.316,
};
const DUNCAN_R_ALPHA_005_GL9 = {
  2: 3.10,
  3: 3.26,
};
// Aproximación para α=0.05 en Lilliefors: D_crit ≈ 0.886 / √n (usada típicamente para n≈4..100).
const LILLIEFORS_D_CRIT_COEFF_005 = 0.886;
const NUMERIC_EPSILON = 1e-12;
const COCHRAN_C_CRIT_K3_N4 = 0.7457;
const Z_CRIT_005_BILATERAL = 1.96;
const CHI2_CRIT_DF2_005 = 5.991;

// ─── Utilidades ────────────────────────────────────────────────────────────────

function parseArray(str) {
  return str
    .split(/[,\s]+/)
    .map((s) => parseFloat(s.trim()))
    .filter((n) => !isNaN(n));
}

function fmt(n, d = 4) {
  return isFinite(n) ? n.toFixed(d) : '—';
}

function showAlert(title, message) {
  if (Platform.OS === 'web' && typeof globalThis.alert === 'function') {
    globalThis.alert(`${title}\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

function getFCritical(alphaTable, df1, df2) {
  const exact = alphaTable[`${df1}-${df2}`];
  if (exact != null) return exact;
  const keys = Object.keys(alphaTable)
    .map((k) => {
      const [d1, d2] = k.split('-').map(Number);
      return { d1, d2, v: alphaTable[k] };
    })
    .filter((x) => x.d1 === df1)
    .sort((a, b) => a.d2 - b.d2);
  if (!keys.length) return null;
  const nearest = keys.reduce((best, cur) =>
    Math.abs(cur.d2 - df2) < Math.abs(best.d2 - df2) ? cur : best
  );
  return nearest.v;
}

function normCdf(x) {
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * z);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-z * z);
  return 0.5 * (1 + sign * erf);
}

function sampleVariance(arr) {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((acc, x) => acc + Math.pow(x - m, 2), 0) / (arr.length - 1);
}

function calculateLilliefors(residuals) {
  const n = residuals.length;
  const mean = residuals.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(sampleVariance(residuals)) || NUMERIC_EPSILON;
  const zSorted = residuals.map((r) => (r - mean) / sd).sort((a, b) => a - b);

  let dPlus = 0;
  let dMinus = 0;
  zSorted.forEach((z, idx) => {
    const i = idx + 1;
    const fz = normCdf(z);
    dPlus = Math.max(dPlus, i / n - fz);
    dMinus = Math.max(dMinus, fz - (i - 1) / n);
  });

  const dCalc = Math.max(dPlus, dMinus);
  const dCrit = LILLIEFORS_D_CRIT_COEFF_005 / Math.sqrt(n);
  return {
    dCalc,
    dCrit,
    normal: dCalc <= dCrit,
    conclusion:
      dCalc <= dCrit
        ? 'No se rechaza normalidad de residuales (α=0.05).'
        : 'Se rechaza normalidad de residuales (α=0.05).',
  };
}

function calculateRunsTest(residuals) {
  const signs = residuals
    .map((r) => (r >= 0 ? 1 : -1));

  const n1 = signs.filter((s) => s > 0).length;
  const n2 = signs.filter((s) => s < 0).length;
  if (n1 === 0 || n2 === 0) {
    return {
      runs: 1,
      n1,
      n2,
      zCalc: 0,
      independent: false,
      conclusion: 'No es posible evaluar rachas (todos los residuales tienen el mismo signo).',
    };
  }

  let runs = 1;
  for (let i = 1; i < signs.length; i++) {
    if (signs[i] !== signs[i - 1]) runs += 1;
  }

  const mu = 1 + (2 * n1 * n2) / (n1 + n2);
  const variance =
    (2 * n1 * n2 * (2 * n1 * n2 - n1 - n2)) /
    (Math.pow(n1 + n2, 2) * (n1 + n2 - 1));
  const sigma = Math.sqrt(Math.max(variance, NUMERIC_EPSILON));
  const zCalc = Math.abs((runs - mu) / sigma);
  const independent = zCalc <= Z_CRIT_005_BILATERAL;

  return {
    runs,
    n1,
    n2,
    zCalc,
    independent,
    conclusion: independent
      ? 'No se rechaza independencia (residuales aleatorios).'
      : 'Se rechaza independencia (patrón no aleatorio).',
  };
}

function calculateCochran(groups) {
  const variances = groups.map((g) => sampleVariance(g));
  const maxVar = Math.max(...variances);
  const sumVar = variances.reduce((a, b) => a + b, 0);
  const cCalc = sumVar === 0 ? 0 : maxVar / sumVar;
  const homogeneous = cCalc <= COCHRAN_C_CRIT_K3_N4;

  return {
    variances,
    cCalc,
    cCrit: COCHRAN_C_CRIT_K3_N4,
    homogeneous,
    conclusion: homogeneous
      ? 'No se rechaza homocedasticidad (varianzas homogéneas).'
      : 'Se rechaza homocedasticidad (varianzas no homogéneas).',
  };
}

function calculateDuncan(means, ns, mse) {
  const nBar = ns.reduce((a, b) => a + b, 0) / ns.length;
  const order = means
    .map((mean, idx) => ({ mean, idx, name: GROUP_NAMES[idx] || `Grupo ${idx + 1}` }))
    .sort((a, b) => b.mean - a.mean);

  const comparisons = [];
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      const p = j - i + 1;
      const rAlpha = DUNCAN_R_ALPHA_005_GL9[p];
      const supported = rAlpha != null;
      const rp = supported ? rAlpha * Math.sqrt(mse / nBar) : NaN;
      const diff = Math.abs(order[i].mean - order[j].mean);
      comparisons.push({
        a: order[i],
        b: order[j],
        p,
        rAlpha,
        supported,
        rp,
        diff,
        significant: supported ? diff > rp : null,
      });
    }
  }

  const idxSwiftPay = 2;
  const meanSwiftPay = means[idxSwiftPay];
  // En este problema la métrica es latencia: menor media implica mejor arquitectura.
  const isBestMean = meanSwiftPay === Math.min(...means);
  const swiftPayComparisons = comparisons.filter(
    (c) => c.a.idx === idxSwiftPay || c.b.idx === idxSwiftPay
  );
  const betterAndSignificant = swiftPayComparisons.every((c) => {
    if (!c.supported || c.significant == null) return false;
    const otherMean = c.a.idx === idxSwiftPay ? c.b.mean : c.a.mean;
    return meanSwiftPay < otherMean && c.significant;
  });
  const recommendSwiftPay = isBestMean && betterAndSignificant;
  const hasUnsupportedComparisons = comparisons.some((c) => !c.supported);

  return {
    comparisons,
    recommendSwiftPay,
    hasUnsupportedComparisons,
    conclusion: recommendSwiftPay
      ? 'Duncan: se recomienda SwiftPay (A3), presenta menor latencia con diferencias significativas.'
      : 'Duncan: no hay evidencia suficiente para recomendar únicamente SwiftPay (A3).',
  };
}

function calculateKruskalWallis(groups) {
  const pooled = groups.flatMap((g, gi) => g.map((value) => ({ value, gi })));
  const sorted = [...pooled].sort((a, b) => a.value - b.value);

  const ranks = Array(sorted.length).fill(0);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].value === sorted[i].value) j++;
    const avgRank = (i + 1 + j + 1) / 2;
    for (let t = i; t <= j; t++) ranks[t] = avgRank;
    i = j + 1;
  }

  const rankSums = Array(groups.length).fill(0);
  sorted.forEach((row, idx) => {
    rankSums[row.gi] += ranks[idx];
  });

  const n = pooled.length;
  const h =
    (12 / (n * (n + 1))) *
      rankSums.reduce((acc, r, gi) => acc + (r * r) / groups[gi].length, 0) -
    3 * (n + 1);

  const rejectH0 = h > CHI2_CRIT_DF2_005;
  return {
    h,
    df: groups.length - 1,
    chiCrit: CHI2_CRIT_DF2_005,
    rejectH0,
    conclusion: rejectH0
      ? 'Kruskal-Wallis rechaza H0: existen diferencias entre arquitecturas.'
      : 'Kruskal-Wallis no rechaza H0: no se detectan diferencias significativas.',
  };
}

// ─── Cálculos ANOVA de un Factor ───────────────────────────────────────────────

function calcANOVA(groups) {
  const k = groups.length;
  const ns = groups.map((g) => g.length);
  const N = ns.reduce((a, b) => a + b, 0);

  const means = groups.map((g) => g.reduce((a, b) => a + b, 0) / g.length);
  const grandMean = groups.flat().reduce((a, b) => a + b, 0) / N;
  const taus = means.map((m) => m - grandMean);

  // Suma de cuadrados entre grupos (SSB)
  const SSB = ns.reduce((acc, n, i) => acc + n * Math.pow(means[i] - grandMean, 2), 0);
  // Suma de cuadrados dentro (SSW / SSE)
  const SSW = groups.reduce((acc, g, i) => {
    return acc + g.reduce((a, x) => a + Math.pow(x - means[i], 2), 0);
  }, 0);
  const SST = SSB + SSW;

  const dfB = k - 1;
  const dfW = N - k;
  const dfT = N - 1;

  const MSB = SSB / dfB;
  const MSW = SSW / dfW;
  const F = MSB / MSW;

  const residuals = groups.flatMap((g, gi) => g.map((x) => x - means[gi]));
  const fCrit = getFCritical(F_CRIT_005, dfB, dfW);
  const rejectH0 = fCrit != null ? F > fCrit : null;

  const duncan = calculateDuncan(means, ns, MSW);
  const lilliefors = calculateLilliefors(residuals);
  const runs = calculateRunsTest(residuals);
  const cochran = calculateCochran(groups);

  return {
    SSB,
    SSW,
    SST,
    dfB,
    dfW,
    dfT,
    MSB,
    MSW,
    F,
    grandMean,
    means,
    taus,
    ns,
    N,
    k,
    residuals,
    fCrit,
    rejectH0,
    duncan,
    lilliefors,
    runs,
    cochran,
  };
}

// ─── Componente Tabla ANOVA ───────────────────────────────────────────────────

function AnovaTable({ result, kruskal }) {
  if (!result) return null;
  const {
    SSB,
    SSW,
    SST,
    dfB,
    dfW,
    dfT,
    MSB,
    MSW,
    F,
    means,
    taus,
    fCrit,
    rejectH0,
    duncan,
    lilliefors,
    runs,
    cochran,
  } = result;

  const rows = [
    { fuente: 'Entre grupos', SS: SSB, df: dfB, MS: MSB, F: F },
    { fuente: 'Dentro grupos', SS: SSW, df: dfW, MS: MSW, F: null },
    { fuente: 'Total', SS: SST, df: dfT, MS: null, F: null },
  ];

  return (
    <View style={styles.tableWrapper}>
      <Text style={styles.sectionTitle}>📋 Tabla ANOVA</Text>

      {/* Modelo y estimadores */}
      <View style={styles.statsBox}>
        <Text style={styles.statsTitle}>Modelo y estimadores</Text>
        <Text style={styles.statsRow}>μ (media global) = {fmt(result.grandMean, 4)}</Text>
        <Text style={styles.statsRow}>σ² estimado (CM Error) = {fmt(MSW, 4)}</Text>
        {means.map((mean, i) => (
          <Text key={i} style={styles.statsRow}>
            {GROUP_NAMES[i] || `Grupo ${i + 1}`}: x̄={fmt(mean, 4)}  |  τ{i + 1} = x̄{i + 1} - μ = {fmt(taus[i], 4)}
          </Text>
        ))}
      </View>

      {/* Tabla */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[styles.tableRow, styles.tableHeader]}>
            {['Fuente', 'SC', 'gl', 'CM', 'F calc'].map((h) => (
              <Text key={h} style={[styles.tableCell, styles.tableCellHeader]}>
                {h}
              </Text>
            ))}
          </View>
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

      {/* ANOVA 8 pasos: conclusión automática */}
      <View style={styles.verdictBox}>
        <Text style={styles.verdictText}>
          F calculado = <Text style={styles.verdictValue}>{fmt(F)}</Text>
        </Text>
        <Text style={styles.verdictHint}>
          F crítico (α=0.05, gl₁={dfB}, gl₂={dfW}) = {fCrit != null ? fmt(fCrit, 4) : 'No disponible en tabla interna'}
        </Text>
        <Text style={[styles.conclusionText, rejectH0 ? styles.reject : styles.accept]}>
          {rejectH0 == null
            ? 'No se pudo concluir H0 porque no hay F crítico en tabla interna.'
            : rejectH0
            ? 'Conclusión ANOVA: Se rechaza H0. Existen diferencias significativas entre arquitecturas.'
            : 'Conclusión ANOVA: No se rechaza H0. No se detectan diferencias significativas entre arquitecturas.'}
        </Text>
      </View>

      {/* Duncan */}
      <View style={styles.testCard}>
        <Text style={styles.testTitle}>🔎 Comparaciones múltiples (Duncan, α=0.05, gl_error=9)</Text>
        {duncan.comparisons.map((cmp, idx) => (
          <Text key={idx} style={styles.testRow}>
            {cmp.a.name} vs {cmp.b.name}: |Δ|={fmt(cmp.diff, 4)}  |  Rp(p={cmp.p})={fmt(cmp.rp, 4)}  →{' '}
            <Text style={cmp.significant ? styles.reject : styles.accept}>
              {cmp.supported
                ? cmp.significant
                  ? 'Diferentes'
                  : 'No diferentes'
                : 'p no soportado en tabla interna'}
            </Text>
          </Text>
        ))}
        {duncan.hasUnsupportedComparisons && (
          <Text style={styles.testRow}>
            Aviso: hay comparaciones con p no soportado por la tabla interna de Duncan.
          </Text>
        )}
        <Text style={[styles.conclusionText, duncan.recommendSwiftPay ? styles.accept : styles.reject]}>
          {duncan.conclusion}
        </Text>
      </View>

      {/* Normalidad */}
      <View style={styles.testCard}>
        <Text style={styles.testTitle}>📐 Prueba de Lilliefors (residuales)</Text>
        <Text style={styles.testRow}>D_calc = {fmt(lilliefors.dCalc, 4)}</Text>
        <Text style={styles.testRow}>D_crit = {fmt(lilliefors.dCrit, 4)} (α=0.05)</Text>
        <Text style={[styles.conclusionText, lilliefors.normal ? styles.accept : styles.reject]}>
          {lilliefors.conclusion}
        </Text>
      </View>

      {/* Aleatoriedad */}
      <View style={styles.testCard}>
        <Text style={styles.testTitle}>🎲 Prueba de Rachas (runs test)</Text>
        <Text style={styles.testRow}>Número de rachas R = {runs.runs}</Text>
        <Text style={styles.testRow}>Z_calc = {fmt(runs.zCalc, 4)} | Z_crit = {fmt(Z_CRIT_005_BILATERAL, 2)}</Text>
        <Text style={[styles.conclusionText, runs.independent ? styles.accept : styles.reject]}>
          {runs.conclusion}
        </Text>
      </View>

      {/* Varianza */}
      <View style={styles.testCard}>
        <Text style={styles.testTitle}>🧪 Prueba de Cochran (homocedasticidad)</Text>
        {cochran.variances.map((v, i) => (
          <Text key={i} style={styles.testRow}>Var({GROUP_NAMES[i] || `Grupo ${i + 1}`}) = {fmt(v, 4)}</Text>
        ))}
        <Text style={styles.testRow}>C_calc = {fmt(cochran.cCalc, 4)} | C_crit = {fmt(cochran.cCrit, 4)} (k=3, n=4)</Text>
        <Text style={[styles.conclusionText, cochran.homogeneous ? styles.accept : styles.reject]}>
          {cochran.conclusion}
        </Text>
      </View>

      {/* No paramétrica */}
      {kruskal && (
        <View style={styles.testCard}>
          <Text style={styles.testTitle}>📊 Kruskal-Wallis (no paramétrica)</Text>
          <Text style={styles.testRow}>H = {fmt(kruskal.h, 4)} | χ²_crit(df={kruskal.df}, α=0.05) = {fmt(kruskal.chiCrit, 3)}</Text>
          <Text style={[styles.conclusionText, kruskal.rejectH0 ? styles.reject : styles.accept]}>
            {kruskal.conclusion}
          </Text>
          <Text style={styles.testRow}>
            Consistencia con ANOVA (inciso 2):{' '}
            <Text style={styles.conclusionText}>
              {result.rejectH0 == null
                ? 'no evaluable'
                : result.rejectH0 === kruskal.rejectH0
                ? 'sí, mantiene la decisión.'
                : 'no, la decisión difiere de ANOVA.'}
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Pantalla Principal ───────────────────────────────────────────────────────

export default function AnovaScreen() {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1024;
  const [g1, setG1] = useState('3.30, 3.42, 3.36, 3.34');
  const [g2, setG2] = useState('3.25, 3.15, 3.30, 3.20');
  const [g3, setG3] = useState('3.10, 3.25, 3.18, 3.12');
  const [result, setResult] = useState(null);
  const [kruskal, setKruskal] = useState(null);

  function parseGroupsFromInputs() {
    return [parseArray(g1), parseArray(g2), parseArray(g3)];
  }

  function handleCalcular() {
    const groups = parseGroupsFromInputs();
    if (groups.some((g) => g.length < 2)) {
      showAlert('Error', 'Cada grupo debe tener al menos 2 valores numéricos.');
      return;
    }
    setResult(calcANOVA(groups));
    setKruskal(null);
  }

  function handleKruskal() {
    const groups = parseGroupsFromInputs();
    if (groups.some((g) => g.length < 2)) {
      showAlert('Error', 'Para Kruskal-Wallis, cada grupo debe tener al menos 2 datos.');
      return;
    }
    setKruskal(calculateKruskalWallis(groups));
  }

  function handleLimpiar() {
    setG1('');
    setG2('');
    setG3('');
    setResult(null);
    setKruskal(null);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          isDesktopWeb && styles.containerDesktop,
        ]}
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
            <TouchableOpacity style={styles.btnKruskal} onPress={handleKruskal}>
              <Text style={styles.btnKruskalText}>Kruskal-Wallis</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleLimpiar}>
              <Text style={styles.btnSecondaryText}>Limpiar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabla de resultados */}
        {result && <AnovaTable result={result} kruskal={kruskal} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  container: { padding: 16, paddingBottom: 32 },
  containerDesktop: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },

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

  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  btnPrimary: {
    flex: 2,
    backgroundColor: '#1565C0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 2,
  },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  btnKruskal: {
    flex: 1.3,
    backgroundColor: '#00897B',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnKruskalText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#ECEFF1',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSecondaryText: { color: '#546E7A', fontWeight: '600', fontSize: 14 },

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

  testCard: {
    marginTop: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#90A4AE',
  },
  testTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#37474F',
    marginBottom: 6,
  },
  testRow: {
    fontSize: 12,
    color: '#455A64',
    lineHeight: 18,
    marginBottom: 2,
  },
  conclusionText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
    color: '#37474F',
  },
  reject: { color: '#C62828' },
  accept: { color: '#2E7D32' },
});
