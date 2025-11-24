# Guia Prático: Arquitetura Modular de Zeladoria

## 📋 Sumário Executivo

Cada **serviço** (Rocagem, Jardins, Varrição, etc.) é agora um **módulo independente**.

### Estrutura Novo
```
Dashboard (orquestrador)
├── RocagemModule (chave: "rocagem")     ← Isolado completamente
├── JardinsModule (chave: "jardins")     ← Isolado completamente
└── Próximos módulos...
```

### Garantias
✅ Ao trocar de módulo, o anterior é **100% desmontado**  
✅ Sem efeitos colaterais, sem vazamento de estado  
✅ Cada módulo pode evoluir independentemente  

---

## 🔧 Como Usar no Dashboard

```typescript
// client/src/pages/dashboard.tsx
import { RocagemModule } from '@/modules/rocagem';
import { JardinsModule } from '@/modules/jardins';

export default function Dashboard() {
  const [selectedService, setSelectedService] = useState('');
  
  return (
    <>
      {/* IMPORTANTE: key força desmontagem completa */}
      {selectedService === 'rocagem' && <RocagemModule key="rocagem" {...props} />}
      {selectedService === 'jardins' && <JardinsModule key="jardins" {...props} />}
    </>
  );
}
```

**Por que `key`?** React desmonta completamente o componente anterior ao trocar a `key`, garantindo limpeza de todos os hooks e estado.

---

## 📁 Estrutura de um Módulo

### Pasta Mínima
```
modules/
└── seu-modulo/
    ├── components/          # Componentes específicos
    ├── hooks/
    │   └── useModuleState.ts   # ⭐ OBRIGATÓRIO: Encapsula estado
    ├── types.ts             # Tipos do módulo
    ├── ModuleComponent.tsx   # ⭐ OBRIGATÓRIO: Exporta o módulo
    └── index.ts             # ⭐ OBRIGATÓRIO: Exporta público
```

### Exemplo: `useModuleState.ts`
```typescript
export function useYourServiceState() {
  const [selectedArea, setSelectedArea] = useState(null);
  const [showModal, setShowModal] = useState(false);
  // ... mais estados
  
  // ⭐ CRITICO: Função reset()
  const reset = useCallback(() => {
    setSelectedArea(null);
    setShowModal(false);
    // ... reseta TUDO
  }, []);
  
  return { selectedArea, setSelectedArea, showModal, setShowModal, reset };
}
```

### Exemplo: `ModuleComponent.tsx`
```typescript
export function YourServiceModule({ areas, ...props }: ModuleProps) {
  const state = useYourServiceState();
  
  // ⭐ Cleanup automático ao desmontar
  useEffect(() => {
    return () => state.reset();
  }, [state]);
  
  return (
    <>
      <YourServiceModal state={state} />
      <YourServiceToolbar state={state} />
    </>
  );
}
```

### Exemplo: `index.ts`
```typescript
export { YourServiceModule } from './ModuleComponent';
export { useYourServiceState } from './hooks';
export type { YourServiceModuleProps, YourServiceModuleState } from './types';
```

---

## ✨ Ciclo de Vida de um Módulo

### 1️⃣ Usuário Clica em "Rocagem"
```
setSelectedService('rocagem')
↓
{selectedService === 'rocagem' && <RocagemModule key="rocagem" />}
↓
React MONTA:
- useRocagemState hook
- Todos os modais
- Todos os listeners
```

### 2️⃣ Usuário Clica em "Jardins"
```
setSelectedService('jardins')
↓
React detecta: key mudou ("rocagem" → "jardins")
↓
React DESMONTA RocagemModule completamente:
- useEffect return() executa
- useRocagemState.reset() chamada
- Todos os modais fecham
- Listeners removidos
↓
React MONTA JardinsModule novo:
- useJardinsState hook (totalmente novo)
- Todos os modais de Jardins
```

### Resultado ✅
Interface limpa, zero poluição de estado, transição suave.

---

## 🚀 Criar Novo Módulo (Passo a Passo)

### Passo 1: Criar Pasta
```bash
mkdir -p client/src/modules/seu-modulo/{components,hooks}
```

### Passo 2: `hooks/useYourServiceState.ts`
```typescript
import { useState, useCallback } from 'react';
import type { ServiceArea } from '@shared/schema';

export function useYourServiceState() {
  const [selectedArea, setSelectedArea] = useState<ServiceArea | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  const reset = useCallback(() => {
    setSelectedArea(null);
    setShowModal(false);
  }, []);
  
  return {
    selectedArea, setSelectedArea,
    showModal, setShowModal,
    reset
  };
}
```

### Passo 3: `YourServiceModule.tsx`
```typescript
import { useEffect } from 'react';
import { useYourServiceState } from './hooks/useYourServiceState';

export function YourServiceModule({ areas }: { areas: ServiceArea[] }) {
  const state = useYourServiceState();
  
  useEffect(() => {
    return () => state.reset();
  }, [state]);
  
  return (
    <>
      {/* Seus modais e componentes aqui */}
    </>
  );
}
```

### Passo 4: `index.ts`
```typescript
export { YourServiceModule } from './YourServiceModule';
export { useYourServiceState } from './hooks/useYourServiceState';
```

### Passo 5: `types.ts` (opcional)
```typescript
import type { ServiceArea } from '@shared/schema';

export interface YourServiceModuleProps {
  areas: ServiceArea[];
}
```

### Passo 6: Registrar no Dashboard
```typescript
import { YourServiceModule } from '@/modules/seu-modulo';

// No Dashboard:
{selectedService === 'seu-modulo' && <YourServiceModule key="seu-modulo" areas={areas} />}
```

**Pronto!** Seu módulo está isolado.

---

## 🧹 Regra de Ouro: Cleanup

Cada módulo **DEVE** ter:

1. **Hook com `reset()`**
   ```typescript
   const reset = useCallback(() => {
     setState1(null);
     setState2(null);
     // ... reseta TUDO
   }, []);
   ```

2. **useEffect cleanup no componente**
   ```typescript
   useEffect(() => {
     return () => state.reset();
   }, [state]);
   ```

3. **Prop `key` no Dashboard**
   ```typescript
   <YourModule key={selectedService} />
   ```

Sem essas 3 coisas, o módulo **NÃO** será limpo corretamente ao trocar.

---

## ❌ Anti-Padrões

### ❌ NUNCA coloque modais do módulo no Dashboard
```typescript
// ERRADO!
export default function Dashboard() {
  const [showRocagemModal, setShowRocagemModal] = useState(false);
  
  return (
    <>
      <RocagemModal open={showRocagemModal} />
    </>
  );
}
```

### ✅ SEMPRE coloque no módulo
```typescript
// CORRETO!
export function RocagemModule() {
  const state = useRocagemState();
  
  return (
    <>
      <RocagemModal open={state.showModal} />
    </>
  );
}
```

---

## 📊 Status Atual

### ✅ Pronto
- `modules/rocagem/` → RocagemModule
- `modules/jardins/` → JardinsModule
- Documentação: `DIRETRIZES_ARQUITETURA.md`

### ⏳ Próximo
- Refatorar Dashboard para usar apenas module switching
- Testes: trocar módulo 3x, verificar limpeza

---

## 🎓 FAQ

**P: Por que usar `key`?**  
R: Força React a desmontar E remontar o componente, garantindo limpeza de hooks.

**P: E se esquecer de `reset()`?**  
R: Modal anterior pode aparecer no novo módulo (vazamento de estado).

**P: Posso compartilhar estado entre módulos?**  
R: Não! Use Context ou Redux apenas para dados globais (config, usuário).

**P: Como compartilhar componentes entre módulos?**  
R: Coloque em `modules/shared/` e importe de ambos.

---

## 📚 Referências Rápidas

| Operação | Arquivo | O Quê |
|----------|---------|-------|
| Criar hook de estado | `hooks/useModuleState.ts` | Encapsula TODO estado |
| Criar componente módulo | `ModuleComponent.tsx` | Renderiza componentes + modais |
| Definir tipos | `types.ts` | Interface ModuleProps |
| Exportar | `index.ts` | O que o mundo vê |

---

**Versão:** 1.0  
**Data:** 24 de Novembro de 2025  
**Próxima Revisão:** Após implementação completa
