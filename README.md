# 📚 CatalogGnews

## 🚀 Atualizações Recentes

- Carregamento automático de JSONs. (Atraves de um link direto do repositorio do Github).
- Logica de criação de TAGs refeita ( Agora verifica se tem alguma TAG com o mesmo nome e soma +1).
- Filtro de (Z-A).
- Limpa `Cache` no carregamento.
- Hover com cor no nome dos cards.
- Ajuste de padding nos cards.
- Sistema de linha dupla para os titulos.
- Menu de ação Dropdown para Botões `Editar`/`Duplicar`/`Excluir`
- Menu de `Exportar` para card individual diretamente no card.
- Melhorias visuais no modal exportar cartões.
- Melhorias do Header.
- Efeito de Fade nos cards abaixo do header.
  
---

### 🐞 Bugs Corrigidos

- (NEW) `onClick` falso da foto no modal de detalhes do card.
- Corrigida duplicação de cards durante a criação.
- Corrigido o problema de limitação de tamanho ao carregar imagens na duplicação.
- Corrigido erro silencioso no `onClick` da ampliação da foto de preview no card.

---

### ✨ Novas Funcionalidades

- Exportação de cartões completos ou separados.
- Remoção da necessidade de múltiplas confirmações na exportação.
- Suporte à seleção de múltiplos arquivos JSON na mesma janela.
- Removido o limite de 5MB de armazenamento no `localStorage`.
- Migração do sistema de `localStorage` para **IndexedDB** para maior capacidade e performance.

---

