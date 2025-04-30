const storage = localStorage;

class CardCatalog {
  constructor() {
    this.cards = JSON.parse(storage.getItem('cards')) || [];
    this.cardCounter = parseInt(storage.getItem('cardCounter')) || 0;
    this.elements = {
      searchInput: document.getElementById('search-input'),
      clearSearch: document.getElementById('clear-search'),
      tagFilter: document.getElementById('tag-filter'),
      sortOrder: document.getElementById('sort-order'),
      cardsContainer: document.getElementById('cards-container'),
      totalCards: document.getElementById('total-cards'),
      filteredCards: document.getElementById('filtered-cards'),
      cardModal: document.getElementById('card-modal'),
      cardForm: document.getElementById('card-form'),
      cardType: document.getElementById('card-type'),
      normalFields: document.getElementById('normal-fields'),
      postitFields: document.getElementById('postit-fields'),
      imageModal: document.getElementById('image-modal'),
      imageModalContent: document.getElementById('image-modal-content'),
      detailsModal: document.getElementById('details-modal'),
      deleteModal: document.getElementById('delete-modal'),
      helpModal: document.getElementById('help-modal'),
      importInput: document.getElementById('import-input'),
      toast: document.getElementById('toast'),
      imageInput: document.getElementById('card-image-input'),
      selectImageBtn: document.getElementById('select-image-btn'),
      removeImageBtn: document.getElementById('remove-image-btn'),
      cardNameInput: document.getElementById('card-name'),
      cardNameError: document.getElementById('card-name-error'),
      cardYoutubeInput: document.getElementById('card-youtube'),
      cardYoutubeError: document.getElementById('card-youtube-error'),
      cardAccessInput: document.getElementById('card-access'),
      cardAccessError: document.getElementById('card-access-error'),
      cardDescription: document.getElementById('card-description'),
      cardDescriptionCounter: document.getElementById('card-description-counter'),
      postitText: document.getElementById('postit-text'),
      postitTextCounter: document.getElementById('postit-text-counter'),
      cardImagePreview: document.getElementById('card-image-preview'),
      cardImagePath: document.getElementById('card-image-path'),
    };
    this.setupEventListeners();
    this.assignCodesToExistingCards();
    this.renderCards();
  }

  assignCodesToExistingCards() {
    this.cards = this.cards.map(card => {
      if (!card.code) {
        const tag = card.tag || (card.cardType === 'postit' ? 'NOTE' : 'JRN');
        return { ...card, code: this.generateCardCode(tag, card.createdAt || Date.now()) };
      }
      return card;
    });
    this.saveCards();
  }

  generateCardCode(tag, createdAt) {
    const date = new Date(createdAt);
    const year = date.getFullYear().toString().slice(-2);
    this.cardCounter += 1;
    storage.setItem('cardCounter', this.cardCounter);
    const counter = this.cardCounter.toString().padStart(4, '0');
    return `${tag} ${year}${counter}`;
  }

  createCardElement(card, isRecentlyEdited) {
    const escapeHTML = (str) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };
    const cardElement = document.createElement('div');
    if (card.cardType === 'postit') {
      cardElement.className = `card-postit p-6 rounded-xl shadow-lg transition duration-300 ${isRecentlyEdited ? 'recently-edited' : ''}`;
      cardElement.setAttribute('role', 'article');
      cardElement.setAttribute('aria-labelledby', `card-title-${card.id}`);
      cardElement.innerHTML = `
        <div class="card-header flex justify-between items-start">
          <h3 id="card-title-${card.id}" class="cursor-default">${escapeHTML(card.name)}</h3>
          <span class="tag-code">${escapeHTML(card.code || 'Sem Código')}</span>
        </div>
        <p class="card-postit-text text-sm">${escapeHTML(card.text)}</p>
        <div class="card-actions flex justify-end gap-2 mt-4">
          <button class="card-action-btn bg-[var(--primary-color)] dark:bg-[var(--accent-color)] text-white dark:text-[var(--secondary-color)] hover:bg-[var(--secondary-red)] dark:hover:bg-[#FFB300]" data-action="edit" data-id="${card.id}" title="Editar cartão" aria-label="Editar cartão"><span class="material-icons">edit</span></button>
          <button class="card-action-btn bg-[var(--primary-color)] dark:bg-[var(--accent-color)] text-white dark:text-[var(--secondary-color)] hover:bg-[var(--secondary-red)] dark:hover:bg-[#FFB300]" data-action="duplicate" data-id="${card.id}" title="Duplicar cartão" aria-label="Duplicar cartão"><span class="material-icons">content_copy</span></button>
          <button class="card-action-btn bg-[var(--secondary-color)] dark:bg-[var(--bg-dark)] text-white hover:bg-[#EF5350] dark:hover:bg-[#FFB300]" data-action="delete" data-id="${card.id}" data-name="${escapeHTML(card.name)}" title="Excluir cartão" aria-label="Excluir cartão"><span class="material-icons">delete</span></button>
        </div>
      `;
      return cardElement;
    }
    cardElement.className = `bg-white dark:bg-gradient-to-b dark:from-gray-800 dark:to-gray-900 p-6 rounded-xl shadow-lg hover:shadow-xl transition duration-300 card-preview ${isRecentlyEdited ? 'recently-edited' : ''}`;
    cardElement.setAttribute('role', 'article');
    cardElement.setAttribute('aria-labelledby', `card-title-${card.id}`);
    cardElement.innerHTML = `
      <div class="card-header flex justify-between items-start">
        <h3 id="card-title-${card.id}" class="cursor-pointer hover:text-[var(--primary-color)] dark:hover:text-[var(--accent-color)]" data-action="open-details" data-id="${card.id}">${escapeHTML(card.name)}</h3>
        <span class="tag-code">${escapeHTML(card.code || 'Sem Código')}</span>
      </div>
      <div class="card-image">
        <img src="${escapeHTML(card.image || 'https://via.placeholder.com/300')}" alt="${escapeHTML(card.name)}" loading="lazy" data-action="open-image" data-image="${escapeHTML(card.image || 'https://via.placeholder.com/300')}" title="Ampliar imagem" aria-label="Ampliar imagem do cartão">
      </div>
      <p class="card-description text-sm font-medium">${escapeHTML(card.description)}</p>
      <div class="card-actions flex justify-end gap-2 mt-4">
        <button class="card-action-btn bg-[var(--primary-color)] dark:bg-[var(--accent-color)] text-white dark:text-[var(--secondary-color)] hover:bg-[var(--secondary-red)] dark:hover:bg-[#FFB300]" data-action="edit" data-id="${card.id}" title="Editar cartão" aria-label="Editar cartão"><span class="material-icons">edit</span></button>
        <button class="card-action-btn bg-[var(--primary-color)] dark:bg-[var(--accent-color)] text-white dark:text-[var(--secondary-color)] hover:bg-[var(--secondary-red)] dark:hover:bg-[#FFB300]" data-action="duplicate" data-id="${card.id}" title="Duplicar cartão" aria-label="Duplicar cartão"><span class="material-icons">content_copy</span></button>
        <button class="card-action-btn bg-[var(--secondary-color)] dark:bg-[var(--bg-dark)] text-white hover:bg-[#EF5350] dark:hover:bg-[#FFB300]" data-action="delete" data-id="${card.id}" data-name="${escapeHTML(card.name)}" title="Excluir cartão" aria-label="Excluir cartão"><span class="material-icons">delete</span></button>
      </div>
    `;
    return cardElement;
  }

  renderCards(search = '', tagFilter = '', sortOrder = 'name') {
    this.elements.cardsContainer.innerHTML = '';
    let filteredCards = this.cards;

    if (search) {
      filteredCards = filteredCards.filter(card => 
        card.name.toLowerCase().includes(search.toLowerCase()) || 
        card.description?.toLowerCase().includes(search.toLowerCase()) || 
        card.text?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (tagFilter) {
      filteredCards = filteredCards.filter(card => card.tag === tagFilter);
    }

    filteredCards.sort((a, b) => {
      if (sortOrder === 'name') return a.name.localeCompare(b.name);
      if (sortOrder === 'lastEdited') return b.lastEdited - a.lastEdited;
      if (sortOrder === 'tag') return a.tag.localeCompare(b.tag);
      return 0;
    });

    const recentlyEditedThreshold = Date.now() - 5 * 60 * 1000;
    filteredCards.forEach(card => {
      const isRecentlyEdited = card.lastEdited > recentlyEditedThreshold;
      const cardElement = this.createCardElement(card, isRecentlyEdited);
      this.elements.cardsContainer.appendChild(cardElement);
    });

    this.elements.totalCards.textContent = this.cards.length;
    this.elements.filteredCards.textContent = filteredCards.length;
  }

  saveCards() {
    storage.setItem('cards', JSON.stringify(this.cards));
  }

  openCardModal(card = null) {
    this.elements.cardModal.classList.add('show');
    this.elements.cardForm.reset();
    this.resetFormErrors();
    this.elements.normalFields.classList.remove('hidden');
    this.elements.postitFields.classList.add('hidden');
    this.elements.cardImagePreview.classList.add('hidden');
    this.elements.cardImagePath.textContent = '';
    this.elements.removeImageBtn.classList.add('hidden');
    document.getElementById('modal-title').textContent = card ? 'Editar Cartão' : 'Adicionar Cartão';
    if (card) {
      document.getElementById('card-id').value = card.id;
      this.elements.cardType.value = card.cardType;
      this.elements.cardNameInput.value = card.name;
      if (card.cardType === 'normal') {
        document.getElementById('card-tag').value = card.tag;
        this.elements.cardYoutubeInput.value = card.youtube || '';
        this.elements.cardAccessInput.value = card.access || '';
        this.elements.cardDescription.value = card.description || '';
        this.elements.cardImagePath.textContent = card.image ? 'Imagem carregada' : '';
        this.elements.imageInput.dataset.imagePath = card.image || '';
        if (card.image) {
          this.elements.cardImagePreview.src = card.image;
          this.elements.cardImagePreview.classList.remove('hidden');
          this.elements.removeImageBtn.classList.remove('hidden');
        }
        this.updateDescriptionCounter();
      } else {
        this.elements.postitText.value = card.text || '';
        this.elements.normalFields.classList.add('hidden');
        this.elements.postitFields.classList.remove('hidden');
        this.updatePostitTextCounter();
      }
    } else {
      this.updateDescriptionCounter();
      this.updatePostitTextCounter();
    }
    this.elements.cardNameInput.focus();
  }

  resetFormErrors() {
    this.elements.cardNameInput.classList.remove('error');
    this.elements.cardNameError.classList.add('hidden');
    this.elements.cardYoutubeInput.classList.remove('error');
    this.elements.cardYoutubeError.classList.add('hidden');
    this.elements.cardAccessInput.classList.remove('error');
    this.elements.cardAccessError.classList.add('hidden');
  }

  validateURL(url) {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  updateDescriptionCounter() {
    const length = this.elements.cardDescription.value.length;
    this.elements.cardDescriptionCounter.textContent = `${length}/200 caracteres`;
  }

  updatePostitTextCounter() {
    const length = this.elements.postitText.value.length;
    this.elements.postitTextCounter.textContent = `${length}/500 caracteres`;
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('card-id').value;
    const cardType = this.elements.cardType.value;
    const cardName = this.elements.cardNameInput.value.trim();

    if (!cardName) {
      this.elements.cardNameInput.classList.add('error');
      this.elements.cardNameError.classList.remove('hidden');
      this.showToast('O nome do cartão é obrigatório.', 'error');
      return;
    }
    this.elements.cardNameInput.classList.remove('error');
    this.elements.cardNameError.classList.add('hidden');

    const youtube = this.elements.cardYoutubeInput.value.trim() || '';
    const access = this.elements.cardAccessInput.value.trim() || '';
    if (!this.validateURL(youtube)) {
      this.elements.cardYoutubeInput.classList.add('error');
      this.elements.cardYoutubeError.classList.remove('hidden');
      this.showToast('URL do YouTube inválida.', 'error');
      return;
    }
    this.elements.cardYoutubeInput.classList.remove('error');
    this.elements.cardYoutubeError.classList.add('hidden');

    if (!this.validateURL(access)) {
      this.elements.cardAccessInput.classList.add('error');
      this.elements.cardAccessError.classList.remove('hidden');
      this.showToast('URL de acesso inválida.', 'error');
      return;
    }
    this.elements.cardAccessInput.classList.remove('error');
    this.elements.cardAccessError.classList.add('hidden');

    let newCard;
    const createdAt = id ? this.cards.find(card => card.id === id)?.createdAt || Date.now() : Date.now();
    if (cardType === 'postit') {
      newCard = {
        id: id || Date.now() + Math.random().toString(36).slice(2),
        cardType: 'postit',
        name: cardName,
        text: this.elements.postitText.value.trim() || '',
        tag: 'NOTE',
        code: id ? this.cards.find(card => card.id === id)?.code : this.generateCardCode('NOTE', createdAt),
        lastEdited: Date.now(),
        createdAt
      };
    } else {
      let imagePath = this.elements.imageInput.dataset.imagePath || (id ? this.cards.find(card => card.id === id)?.image : 'https://via.placeholder.com/300');
      if (this.elements.imageInput.files && this.elements.imageInput.files[0]) {
        const reader = new FileReader();
        imagePath = await new Promise(resolve => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(this.elements.imageInput.files[0]);
        });
      }
      const tag = document.getElementById('card-tag').value || 'JRN';
      newCard = {
        id: id || Date.now() + Math.random().toString(36).slice(2),
        cardType: 'normal',
        name: cardName,
        image: imagePath,
        tag,
        code: id ? this.cards.find(card => card.id === id)?.code : this.generateCardCode(tag, createdAt),
        description: this.elements.cardDescription.value.trim() || '',
        youtube,
        access,
        lastEdited: Date.now(),
        createdAt
      };
    }

    if (id) {
      const index = this.cards.findIndex(card => card.id === id);
      if (index !== -1) {
        this.cards[index] = newCard;
      }
    } else {
      this.cards.push(newCard);
    }

    this.saveCards();
    this.closeModal('card');
    this.showToast(`Cartão ${id ? 'editado' : 'adicionado'} com sucesso!`, 'success');
    this.renderCards(
      this.elements.searchInput.value.toLowerCase() || '',
      this.elements.tagFilter.value || '',
      this.elements.sortOrder.value || 'name'
    );
  }

  openDetailsModal(card) {
    if (card.cardType === 'postit') return;
    this.elements.detailsModal.classList.add('show');
    document.getElementById('details-name').textContent = card.name;
    document.getElementById('details-tag').textContent = card.tag;
    document.getElementById('details-code').textContent = card.code || 'Sem Código';
    document.getElementById('details-image').src = card.image || 'https://via.placeholder.com/300';
    document.getElementById('details-image').dataset.image = card.image || 'https://via.placeholder.com/300';
    document.getElementById('details-description').textContent = card.description || 'Sem descrição';
    document.getElementById('details-youtube').href = card.youtube || '#';
    document.getElementById('details-youtube').style.display = card.youtube ? 'inline-flex' : 'none';
    document.getElementById('details-access').href = card.access || '#';
    document.getElementById('details-access').style.display = card.access ? 'inline-flex' : 'none';
    document.getElementById('details-path').textContent = card.access || 'Sem caminho';
    document.getElementById('details-created').textContent = new Date(card.createdAt).toLocaleString('pt-BR');
    document.getElementById('details-last-edited').textContent = new Date(card.lastEdited).toLocaleString('pt-BR');
    document.getElementById('details-copy').onclick = () => {
      navigator.clipboard.writeText(card.access || '');
      this.showToast('Caminho copiado!', 'success');
    };
  }

  openDeleteModal(card) {
    this.elements.deleteModal.classList.add('show');
    document.getElementById('delete-card-name').textContent = card.name;
    document.getElementById('confirm-delete').dataset.id = card.id;
  }

  openHelpModal() {
    this.elements.helpModal.classList.add('show');
  }

  closeModal(type) {
    this.elements[`${type}Modal`].classList.remove('show');
    if (type === 'card') {
      this.elements.cardForm.reset();
      this.resetFormErrors();
      this.elements.cardImagePreview.classList.add('hidden');
      this.elements.cardImagePath.textContent = '';
      this.elements.imageInput.value = '';
      this.elements.imageInput.dataset.imagePath = '';
      this.elements.removeImageBtn.classList.add('hidden');
      this.updateDescriptionCounter();
      this.updatePostitTextCounter();
    }
  }

  openImageModal(imageSrc) {
    this.elements.imageModal.classList.add('show');
    this.elements.imageModalContent.src = imageSrc;
  }

  showToast(message, type) {
    this.elements.toast.textContent = message;
    this.elements.toast.className = `toast ${type} show`;
    setTimeout(() => {
      this.elements.toast.classList.remove('show');
    }, 3000);
  }

  toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    storage.setItem('theme', isDark ? 'dark' : 'light');
    storage.setItem('darkMode', isDark);
    const darkModeToggle = document.querySelector('.dark-mode-toggle');
    darkModeToggle.textContent = isDark ? 'dark_mode' : 'light_mode';
    darkModeToggle.classList.toggle('text-gray-900', isDark);
  }

  async exportCards() {
    const dataStr = JSON.stringify(this.cards, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cards_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Cartões exportados com sucesso!', 'success');
  }

  async importCards(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const importedCards = JSON.parse(text);
      if (!Array.isArray(importedCards)) throw new Error('Arquivo inválido');
      this.cards = [...this.cards, ...importedCards.map(card => ({
        ...card,
        id: Date.now() + Math.random().toString(36).slice(2),
        lastEdited: Date.now(),
        createdAt: card.createdAt || Date.now(),
        code: this.generateCardCode(card.tag || (card.cardType === 'postit' ? 'NOTE' : 'JRN'), card.createdAt || Date.now())
      }))];
      this.saveCards();
      this.renderCards(
        this.elements.searchInput.value.toLowerCase() || '',
        this.elements.tagFilter.value || '',
        this.elements.sortOrder.value || 'name'
      );
      this.showToast('Cartões importados com sucesso!', 'success');
    } catch (err) {
      this.showToast('Erro ao importar cartões.', 'error');
    }
    e.target.value = '';
  }

  duplicateCard(card) {
    const newCard = {
      ...card,
      id: Date.now() + Math.random().toString(36).slice(2),
      name: `${card.name} (Cópia)`,
      lastEdited: Date.now(),
      createdAt: Date.now(),
      code: this.generateCardCode(card.tag || (card.cardType === 'postit' ? 'NOTE' : 'JRN'), Date.now())
    };
    this.cards.push(newCard);
    this.saveCards();
    this.renderCards(
      this.elements.searchInput.value.toLowerCase() || '',
      this.elements.tagFilter.value || '',
      this.elements.sortOrder.value || 'name'
    );
    this.showToast('Cartão duplicado com sucesso!', 'success');
  }

  deleteCard(id) {
    this.cards = this.cards.filter(card => card.id !== id);
    this.saveCards();
    this.renderCards(
      this.elements.searchInput.value.toLowerCase() || '',
      this.elements.tagFilter.value || '',
      this.elements.sortOrder.value || 'name'
    );
    this.showToast('Cartão excluído com sucesso!', 'success');
  }

  setupEventListeners() {
    // Pesquisa
    this.elements.searchInput?.addEventListener('input', (e) => {
      const value = e.target.value;
      this.elements.clearSearch.classList.toggle('hidden', !value);
      this.renderCards(
        value.toLowerCase(),
        this.elements.tagFilter.value || '',
        this.elements.sortOrder.value || 'name'
      );
    });

    this.elements.clearSearch?.addEventListener('click', () => {
      this.elements.searchInput.value = '';
      this.elements.clearSearch.classList.add('hidden');
      this.renderCards(
        '',
        this.elements.tagFilter.value || '',
        this.elements.sortOrder.value || 'name'
      );
    });

    // Filtros e ordenação
    this.elements.tagFilter?.addEventListener('change', (e) => {
      this.renderCards(
        this.elements.searchInput.value.toLowerCase() || '',
        e.target.value,
        this.elements.sortOrder.value || 'name'
      );
    });

    this.elements.sortOrder?.addEventListener('change', (e) => {
      this.renderCards(
        this.elements.searchInput.value.toLowerCase() || '',
        this.elements.tagFilter.value || '',
        e.target.value
      );
    });

    // Formulário do modal
    this.elements.cardForm?.addEventListener('submit', (e) => this.handleFormSubmit(e));

    this.elements.cardType?.addEventListener('change', (e) => {
      const isPostit = e.target.value === 'postit';
      this.elements.normalFields.classList.toggle('hidden', isPostit);
      this.elements.postitFields.classList.toggle('hidden', !isPostit);
      this.resetFormErrors();
    });

    // Validação em tempo real
    this.elements.cardNameInput?.addEventListener('input', (e) => {
      const value = e.target.value.trim();
      if (value) {
        this.elements.cardNameInput.classList.remove('error');
        this.elements.cardNameError.classList.add('hidden');
      }
    });

    this.elements.cardYoutubeInput?.addEventListener('input', (e) => {
      const value = e.target.value.trim();
      if (value && !this.validateURL(value)) {
        this.elements.cardYoutubeInput.classList.add('error');
        this.elements.cardYoutubeError.classList.remove('hidden');
      } else {
        this.elements.cardYoutubeInput.classList.remove('error');
        this.elements.cardYoutubeError.classList.add('hidden');
      }
    });

    this.elements.cardAccessInput?.addEventListener('input', (e) => {
      const value = e.target.value.trim();
      if (value && !this.validateURL(value)) {
        this.elements.cardAccessInput.classList.add('error');
        this.elements.cardAccessError.classList.remove('hidden');
      } else {
        this.elements.cardAccessInput.classList.remove('error');
        this.elements.cardAccessError.classList.add('hidden');
      }
    });

    // Contadores de caracteres
    this.elements.cardDescription?.addEventListener('input', () => {
      this.updateDescriptionCounter();
    });

    this.elements.postitText?.addEventListener('input', () => {
      this.updatePostitTextCounter();
    });

    // Upload e remoção de imagem
    this.elements.selectImageBtn?.addEventListener('click', () => {
      this.elements.imageInput.click();
    });

    this.elements.imageInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          this.elements.cardImagePreview.src = reader.result;
          this.elements.cardImagePreview.classList.remove('hidden');
          this.elements.cardImagePath.textContent = file.name;
          this.elements.imageInput.dataset.imagePath = reader.result;
          this.elements.removeImageBtn.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
      }
    });

    this.elements.removeImageBtn?.addEventListener('click', () => {
      this.elements.imageInput.value = '';
      this.elements.imageInput.dataset.imagePath = '';
      this.elements.cardImagePreview.classList.add('hidden');
      this.elements.cardImagePath.textContent = '';
      this.elements.removeImageBtn.classList.add('hidden');
    });

    // Importação
    this.elements.importInput?.addEventListener('change', (e) => this.importCards(e));

    // Ações nos cartões
    this.elements.cardsContainer?.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      const id = target.dataset.id;
      const card = this.cards.find(c => c.id === id);
      if (!card) return;

      if (action === 'edit') {
        this.openCardModal(card);
      } else if (action === 'duplicate') {
        this.duplicateCard(card);
      } else if (action === 'delete') {
        this.openDeleteModal(card);
      } else if (action === 'open-details') {
        this.openDetailsModal(card);
      } else if (action === 'open-image') {
        this.openImageModal(target.dataset.image);
      }
    });

    // Confirmação de exclusão
    document.getElementById('confirm-delete')?.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      if (id) {
        this.deleteCard(id);
        this.closeModal('delete');
      }
    });

    // Fechar modais com Esc
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ['card', 'image', 'details', 'delete', 'help'].forEach(type => {
          if (this.elements[`${type}Modal`].classList.contains('show')) {
            this.closeModal(type);
          }
        });
      }
    });

    // Atalhos
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        this.openCardModal();
      }
      if ((e.ctrlKey && e.key === 's') || e.key === 'Enter') {
        if (this.elements.cardModal.classList.contains('show')) {
          e.preventDefault();
          this.elements.cardForm.dispatchEvent(new Event('submit'));
        }
      }
    });
  }
}

const cardCatalog = new CardCatalog();