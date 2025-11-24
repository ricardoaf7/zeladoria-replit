# Diretrizes de Arquitetura - Zeladoria em Tempo Real

## 🎯 Regra de Ouro: Isolamento de Módulos

**Cada módulo (serviço) deve ser independente e funcionar em completo isolamento.**

Quando um usuário troca de serviço, TODOS os componentes filhos, estados e modais do serviço anterior devem ser **desmontados, limpos e resetados** antes do novo serviço ser carregado.

### Por Quê?
- **Evita poluição de estado:** Um modal aberto no Rocagem não deve aparecer no Jardins
- **Melhora UX:** Transição limpa entre serviços
- **Facilita manutenção:** Cada módulo pode evoluir independentemente
- **Previne bugs:** Sem efeitos colaterais de estados antigos

---

## 📁 Estrutura de Pastas

```
client/src/
├── modules/                          # Cada módulo é auto-contido
│   ├── rocagem/                      # Serviço: Capina e Roçagem
│   │   ├── components/               # Componentes específicos do módulo
│   │   │   ├── RocagemLegend.tsx
│   │   │   ├── RocagemToolbar.tsx
│   │   │   └── ...
│   │   ├── hooks/                    # Hooks específicos
│   │   │   ├── useRocagemState.ts
│   │   │   └── ...
│   │   ├── types.ts                  # Tipos específicos do módulo
│   │   ├── RocagemModule.tsx         # Exporta tudo + gerencia o módulo
│   │   └── index.ts                  # Exporta para uso externo
│   │
│   ├── jardins/                      # Serviço: Jardins
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── types.ts
│   │   ├── JardinsModule.tsx
│   │   └── index.ts
│   │
│   ├── shared/                       # Componentes compartilhados entre módulos
│   │   ├── MapInfoCard.tsx
│   │   ├── AreaInfoCard.tsx
│   │   └── ...
│   │
│   └── types.ts                      # Tipos compartilhados entre módulos
│
├── components/                       # Componentes globais (theme, ui, etc)
├── pages/
│   └── dashboard.tsx                 # Coordena módulos (apenas lógica de switching)
└── ...
```

---

## 🔄 Fluxo de Troca de Módulos

### ANTES (❌ Errado)
```
Dashboard carrega TODO estado
├─ Modal Rocagem
├─ Modal Jardins
└─ Todos os modais ficam em memória ao trocar serviço
```

### DEPOIS (✅ Correto)
```
Dashboard gerencia seleção de módulo
├─ Usuário clica em "Rocagem"
│  └─ RocagemModule montado (todos seus hooks + componentes)
│
├─ Usuário clica em "Jardins"
│  ├─ RocagemModule completamente DESMONTADO (cleanup)
│  └─ JardinsModule montado (limpo e novo)
```

---

## 🏗️ Como Criar um Novo Módulo

Quando criar um novo serviço, siga este checklist:

### 1️⃣ Criar Pasta do Módulo
```
mkdir -p client/src/modules/seu-servico/{components,hooks}
```

### 2️⃣ Criar Hook de Estado (`useModuleState.ts`)
```typescript
// Encapsula TODOS os estados do módulo
export function useYourServiceState() {
  const [selectedArea, setSelectedArea] = useState<ServiceArea | null>(null);
  const [showModal, setShowModal] = useState(false);
  // ... mais estados específicos
  
  // IMPORTANTE: Função para resetar TUDO
  const reset = useCallback(() => {
    setSelectedArea(null);
    setShowModal(false);
    // ... reseta todos os estados
  }, []);
  
  return { selectedArea, setSelectedArea, showModal, setShowModal, reset };
}
```

### 3️⃣ Criar Componente do Módulo (`YourServiceModule.tsx`)
```typescript
// Componente que ENCAPSULA todo o módulo
export function YourServiceModule() {
  const moduleState = useYourServiceState();
  
  return (
    <>
      <YourServiceToolbar />
      <YourServiceModals moduleState={moduleState} />
    </>
  );
}
```

### 4️⃣ Exportar no Dashboard
```typescript
// dashboard.tsx
import { RocagemModule } from '@/modules/rocagem';
import { JardinsModule } from '@/modules/jardins';

export default function Dashboard() {
  const [selectedService, setSelectedService] = useState('');
  
  return (
    <>
      {selectedService === 'rocagem' && <RocagemModule key="rocagem" />}
      {selectedService === 'jardins' && <JardinsModule key="jardins" />}
    </>
  );
}
```

**IMPORTANTE:** A prop `key` força React a **desmontar completamente** o módulo anterior ao trocar.

---

## 🧹 Cleanup & Desmontagem

### Hooks devem suportar cleanup:
```typescript
useEffect(() => {
  // Código de inicialização
  
  return () => {
    // CLEANUP: Chamado quando o componente desmonta
    // Limpar timers, listeners, cache local, etc.
  };
}, []);
```

### Cada módulo reseta seu próprio estado:
```typescript
// Quando modal fecha ou usuário cancela operação
const handleClose = useCallback(() => {
  moduleState.reset(); // Reseta TUDO
  setShowModal(false);
}, [moduleState]);
```

---

## ✅ Checklist de Implementação

Antes de fazer merge de um novo módulo, verifique:

- [ ] Todos os componentes estão em `modules/seu-modulo/components/`
- [ ] Todos os hooks estão em `modules/seu-modulo/hooks/`
- [ ] Hook principal (`useModuleState`) existe e encapsula TODO estado
- [ ] Hook principal tem função `reset()` que limpa tudo
- [ ] Módulo usa `key` no Dashboard para forçar desmontagem
- [ ] Nenhum estado vaza para o Dashboard (exceto `selectedService`)
- [ ] Não há modais do módulo anterior visíveis ao trocar
- [ ] Cache local é limpo ao desmontar o módulo
- [ ] Testes: trocar módulo 3x e verificar se tudo está limpo

---

## 🚨 Anti-Padrões (NUNCA FAÇA)

❌ **Colocar modais de vários serviços no Dashboard**
```typescript
// ERRADO!
export default function Dashboard() {
  const [showRocagemModal, setShowRocagemModal] = useState(false);
  const [showJardinsModal, setShowJardinsModal] = useState(false);
  // ... mais modais
  
  return (
    <>
      <RocagemModal open={showRocagemModal} />
      <JardinsModal open={showJardinsModal} />
    </>
  );
}
```

❌ **Ter estado compartilhado entre módulos**
```typescript
// ERRADO!
// rocagem/components/QuickRegisterModal.tsx
export function QuickRegisterModal() {
  // Usando estado do Dashboard
  const { area } = useDashboardContext();
  // ...
}
```

✅ **Passar estado APENAS como props necessárias**
```typescript
// CORRETO!
// rocagem/components/QuickRegisterModal.tsx
interface Props {
  area: ServiceArea;
  onClose: () => void;
}

export function QuickRegisterModal({ area, onClose }: Props) {
  // Estado local do módulo apenas
}
```

---

## 📊 Diagrama de Responsabilidades

```
┌─ Dashboard (Orquestrador)
│  ├─ Gerencia: selectedService
│  ├─ Monta/Desmonta: RocagemModule | JardinsModule
│  └─ Compartilha: Dados leves (áreas, config)
│
├─ RocagemModule (Encapsulador)
│  ├─ Gerencia: Estado completo de Rocagem
│  ├─ Encapsula: QuickRegisterModal, ManualForecastModal, etc.
│  └─ Reseta: Tudo ao desmontar
│
├─ JardinsModule (Encapsulador)
│  └─ Idem...
│
└─ Modules/shared/ (Reutilizável)
   ├─ MapInfoCard (usado por vários módulos)
   └─ AreaInfoCard (usado por vários módulos)
```

---

## 🎓 Exemplo Real: Trocar de Rocagem para Jardins

### Passo 1: Usuário clica em Rocagem
```
setSelectedService('rocagem')
↓
Dashboard renderiza <RocagemModule key="rocagem" />
↓
RocagemModule monta:
  ├─ useRocagemState hook
  ├─ QuickRegisterModal, ManualForecastModal
  └─ MapLegend específica
```

### Passo 2: Usuário clica em Jardins
```
setSelectedService('jardins')
↓
React detecta: key mudou de "rocagem" para "jardins"
↓
RocagemModule DESMONTA completamente:
  ├─ useRocagemState cleanup
  ├─ Todos os modais fecham
  ├─ Listeners removidos
  └─ Cache local limpo
↓
JardinsModule MONTA novo:
  ├─ useJardinsState hook (totalmente novo)
  ├─ JardinsRegisterModal
  └─ MapLegend específica
```

### Resultado: ✅ Interface limpa, sem poluição de estado

---

## 📖 Referências

- [React: Conditional Rendering](https://react.dev/learn/conditional-rendering)
- [React: Key Prop](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key)
- [React: useEffect Cleanup](https://react.dev/reference/react/useEffect#cleaning-up-an-effect)
- [React: Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)

---

**Versão:** 1.0  
**Última atualização:** 24 de Novembro de 2025  
**Autor:** Zeladoria Team
