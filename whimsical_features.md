# Whimsical Clone - Análise e Especificação Funcional

Este documento detalha as funcionalidades esperadas de um clone do Whimsical, o status atual da implementação e o plano de ação para correções e melhorias.

## 1. Relação de Funcionalidades (Whimsical Padrão)

### A. Criação e Manipulação de Nós (Nodes)
*   **Sticky Notes:** Criação rápida de notas adesivas com cores variadas. Texto centralizado.
*   **Shapes (Formas):** Retângulos, Círculos, Pílulas, Diamantes (Losangos). Uso para fluxogramas.
*   **Texto Livre:** Texto sem bordas ou fundo para anotações gerais.
*   **Edição de Texto:** Clique duplo ou Enter para editar. Suporte a Markdown básico (negrito, itálico).
*   **Redimensionamento:** Arrastar arestas/cantos para redimensionar. O texto deve se ajustar (wrap) ou aumentar a fonte (dependendo do modo).
*   **Movimentação:** Arrastar para mover. Alinhamento com guias inteligentes (snap).

### B. Conexões (Connectors)
*   **Criação:** Arrastar de um nó para outro (ou de pontos de ancoragem específicos).
*   **Roteamento:** Linhas retas, curvas (Bezier) ou cotovelos (Orthogonal). Evitar sobreposição de nós.
*   **Pontos de Ancoragem:** As conexões grudam no centro ou nas bordas (Norte, Sul, Leste, Oeste).
*   **Setas:** Configuração de pontas (nenhuma, seta, círculo).

### C. Interação e Navegação (Canvas)
*   **Pan (Mover Canvas):** Espaço + Arrastar ou Botão do Meio do Mouse.
*   **Zoom:** Roda do mouse (Ctrl + Wheel) ou gestos de pinça.
*   **Seleção:**
    *   Clique simples: Seleciona um.
    *   Shift + Clique: Seleção múltipla.
    *   Rubber Band (Caixa de Seleção): Arrastar no fundo do canvas seleciona tudo dentro da área.
*   **Exclusão:** Tecla `Delete` ou `Backspace` remove itens selecionados.
*   **Duplicação:** `Ctrl + D` ou `Alt + Arrastar` (Option + Arrastar no Mac).

## 2. Análise do Código Atual

### Problemas Identificados
1.  **Conexões:**
    *   Atualmente desenhadas do centro ao centro (`getNodeCenter`). Isso causa linhas feias cruzando os objetos.
    *   Não há detecção de borda mais próxima.
2.  **Redimensionamento:**
    *   `Node.tsx` usa um `ResizeObserver` para ajustar a altura baseado no texto, mas não permite que o usuário arraste para mudar o tamanho arbitrariamente (falta de "handlers").
    *   O texto vaza ou o componente muda de tamanho de forma incontrolável.
3.  **Seleção:**
    *   Não existe "Rubber Band selection" (arrastar no fundo cria um nó atualmente, dependendo da ferramenta).
4.  **Atalhos:**
    *   Falta implementação robusta de `Delete`, `Ctrl+Z` (Undo), `Ctrl+C/V`.

## 3. Plano de Ajustes (Checklist)

### Fase 1: Core - Redimensionamento e Texto
- [ ] **Implementar Resizable:** Adicionar manipuladores (alças) nos cantos e laterais dos nós selecionados.
- [ ] **Fixar Texto:** O texto deve quebrar linha (`word-wrap`) respeitando a largura definida pelo usuário.
- [ ] **Ajuste de Shapes:** Garantir que formas como Diamante e Círculo renderizem o conteúdo corretamente dentro dos limites.

### Fase 2: Conexões Inteligentes
- [ ] **Anchor Points:** Calcular a interseção da linha com a borda do nó (ao invés do centro).
- [ ] **Melhoria Visual:** Usar curvas suaves ou linhas ortogonais se possível.

### Fase 3: Interação e Atalhos
- [ ] **Rubber Band Selection:** Implementar lógica de caixa de seleção ao arrastar no fundo com a ferramenta `SELECT`.
- [ ] **Atalhos de Teclado:**
    - [ ] `Delete`/`Backspace`: Apagar.
    - [ ] `Enter`: Editar texto.
    - [ ] `Esc`: Cancelar seleção/edição.
    - [ ] `Ctrl + Arrastar`: Duplicar nó (ou Alt + Arrastar).
    - [ ] `Ctrl + A`: Selecionar tudo.

### Fase 4: Refinamento Visual
- [ ] Garantir que o Grid se comporte corretamente com o Zoom.
- [ ] Melhorar a barra de ferramentas (feedback visual da ferramenta ativa).
