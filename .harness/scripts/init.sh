#!/usr/bin/env bash

set -Eeuo pipefail

echo "[ARNES IA] Ejecutando verificacion de entorno, linters y pruebas..."

if [[ ! -f "agents.md" || ! -f ".harness/tasks/featurelist.json" ]]; then
    echo "[ARNES IA] ERROR CRITICO: archivos base del arnes no encontrados."
    exit 1
fi

if [[ -d ".git" && ! -f ".git/hooks/pre-commit" ]]; then
    cp .githooks/pre-commit .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
    echo "[ARNES IA] Git pre-commit hook instalado."
fi

if command -v code-review-graph &>/dev/null; then
    code-review-graph build >/dev/null 2>&1
fi

if [[ -f "package.json" ]]; then
    node -e "const fs = require('node:fs'); const p = JSON.parse(fs.readFileSync('package.json')); if (!p.scripts?.test) process.exit(1)" || {
        echo "[ARNES IA] ERROR: package.json debe declarar scripts.test."
        exit 1
    }
    npm test
    if node -e "const fs = require('node:fs'); const p = JSON.parse(fs.readFileSync('package.json')); process.exit(p.scripts?.typecheck ? 0 : 1)"; then
        npm run typecheck
    fi
elif [[ -f "pytest.ini" || -f "requirements.txt" ]]; then
    command -v pytest &>/dev/null || {
        echo "[ARNES IA] ERROR: pytest no esta instalado."
        exit 1
    }
    pytest
else
    found_test=false
    for test_file in .harness/tests/*.sh; do
        [[ -f "$test_file" ]] || continue
        found_test=true
        bash "$test_file"
    done
    [[ "$found_test" == true ]] || {
        echo "[ARNES IA] ERROR: no se detecto una suite de pruebas."
        exit 1
    }
fi

echo "[ARNES IA] Verificacion completada en verde."
