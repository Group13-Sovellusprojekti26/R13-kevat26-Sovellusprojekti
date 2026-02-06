/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function patchExpoHapticsTsconfig() {
  const hapticsTsconfigPath = path.join(projectRoot, 'node_modules', 'expo-haptics', 'tsconfig.json');
  if (!fileExists(hapticsTsconfigPath)) {
    return { patched: false, reason: 'expo-haptics tsconfig not found' };
  }

  const value = readJson(hapticsTsconfigPath);
  let changed = false;

  // 1) Fix extends path: expo-haptics expects "expo-module-scripts/tsconfig.base".
  // Newer expo-module-scripts ships "tsconfig.base.json". VS Code/JSON schema also wants a resolvable file.
  const desiredExtends = 'expo-module-scripts/tsconfig.base.json';
  const expoModuleScriptsBaseJson = path.join(
    projectRoot,
    'node_modules',
    'expo-module-scripts',
    'tsconfig.base.json'
  );

  if (value.extends === 'expo-module-scripts/tsconfig.base' && fileExists(expoModuleScriptsBaseJson)) {
    value.extends = desiredExtends;
    changed = true;
  }

  // 2) Fix schema error: emitDeclarationOnly requires declaration or composite in the same file.
  value.compilerOptions = value.compilerOptions ?? {};
  if (value.compilerOptions.emitDeclarationOnly === true) {
    const hasDeclaration = value.compilerOptions.declaration === true;
    const hasComposite = value.compilerOptions.composite === true;
    if (!hasDeclaration && !hasComposite) {
      value.compilerOptions.declaration = true;
      changed = true;
    }
  }

  if (changed) {
    writeJson(hapticsTsconfigPath, value);
  }

  return { patched: changed };
}

try {
  const result = patchExpoHapticsTsconfig();
  if (result.patched) {
    console.log('[postinstall] Patched expo-haptics/tsconfig.json');
  }
} catch (err) {
  console.warn('[postinstall] Failed to patch expo-haptics/tsconfig.json:', err?.message ?? err);
}
