# 📊 Proyecto de Estadística (ANOVA & Regresión Lineal)

![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)

Una aplicación móvil moderna diseñada para realizar cálculos estadísticos avanzados como **ANOVA** (Análisis de Varianza) y **Regresión Lineal Múltiple**. Construida con React Native y Expo para un rendimiento fluido y multiplataforma.

---

## 🚀 Cómo Ejecutar el Proyecto

Para comenzar, asegúrate de tener instalado [Node.js](https://nodejs.org/) en tu computadora.

### 1. Clonar e Instalar
```bash
# Clonar el repositorio
git clone https://github.com/aech18/Proyecto-Estadistica.git

# Entrar a la carpeta
cd ProyectoEstadistica

# Instalar las dependencias
npm install
```

### 2. Iniciar el Servidor de Desarrollo
```bash
npx expo start
```
Se abrirá una pestaña en tu navegador con un código QR.

### 3. Ejecutar versión Web
```bash
npm run web
```
Luego abre `http://localhost:8081` en tu navegador.

---

## 📲 Ejecución en Dispositivos

### 🍏 En iOS
- **Dispositivo Real:**
  1. Instala la app **"Expo Go"** desde la App Store.
  2. Escanea el código QR con la cámara de tu iPhone.
- **Simulador:**
  1. Presiona `i` en la terminal donde se está ejecutando el proyecto.
  *Nota: Requiere macOS con Xcode instalado.*

### 🤖 En Android
- **Dispositivo Real:**
  1. Instala la app **"Expo Go"** desde la Play Store.
  2. Abre la app Expo Go y selecciona "Scan QR Code".
- **Emulador:**
  1. Asegúrate de tener Android Studio y el emulador abierto.
  2. Presiona `a` en la terminal.

---

## 🌐 Build Web de Producción

Genera archivos estáticos para despliegue:

```bash
npm run build:web
```

Los archivos de salida se crean en la carpeta `dist/`.

---

## 🚀 Despliegue Web

### Vercel
- Framework preset: **Other**
- Build command: `npm run build:web`
- Output directory: `dist`

### Netlify
- Build command: `npm run build:web`
- Publish directory: `dist`

### GitHub Pages
- Publica el contenido de `dist/` en tu rama de páginas.
- Si usas rutas distintas a `/`, configura el proyecto para servir desde raíz o añade fallback de SPA (`404.html` apuntando a `index.html`).

---

## ✨ Características Principales
- **ANOVA:** Ingresa hasta tres grupos de datos y obtén resultados instantáneos (Varianza, Suma de Cuadrados, Valor-F).
- **Regresión Lineal:** Análisis de regresión múltiple con entrada de datos flexible.
- **Diseño Premium:** Interfaz limpia con navegación por pestañas (Bottom Tab Navigation).

---

## 🛠️ Tecnologías Utilizadas
- **React Native** & **Expo**
- **React Navigation** (Tabs)
- **JavaScript (ES6+)**

---
*Desarrollado para el Proyecto de Estadística.*
