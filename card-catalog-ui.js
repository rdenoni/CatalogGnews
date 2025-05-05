class CardCatalogUI extends CardCatalog {
    createCardElement(card) {
        const div = document.createElement('div');
        div.className = 'card-preview rounded-2xl shadow-lg p-4 sm:p-6 relative bg-white dark:bg-gray-700 transition-all';
        div.innerHTML = `
            <div class="card-header flex justify-between items-start gap-2">
                <h3 class="cursor-pointer truncate flex-1" data-action="open-details" data-id="${card.id}">${this.escapeHTML(card.name)}</h3>
                <div class="card-actions flex gap-1">
                    <button class="card-action-btn edit-btn" data-action="edit-card" data-id="${card.id}" title="Editar cartão" aria-label="Editar cartão">
                        <span class="material-icons text-lg">edit</span>
                    </button>
                    <button class="card-action-btn duplicate-btn" data-action="duplicate-card" data-id="${card.id}" title="Duplicar cartão" aria-label="Duplicar cartão">
                        <span class="material-icons text-lg">content_copy</span>
                    </button>
                    <button class="card-action-btn delete-btn" data-action="delete-card" data-id="${card.id}" title="Excluir cartão" aria-label="Excluir cartão">
                        <span class="material-icons text-lg">delete</span>
                    </button>
                </div>
            </div>
            ${card.image ? `
            <div class="card-image mt-2">
                <img src="${card.image}" alt="Imagem do cartão ${this.escapeHTML(card.name)}" data-action="open-image" data-image="${card.image}">
            </div>
            ` : ''}
            <div class="card-footer mt-2">
                <span class="tag-code">${this.escapeHTML(card.code || 'Sem Código')}</span>
                ${card.access ? `
                <div class="access-path mt-2">
                    <button class="copy-access-btn text-gray-600 dark:text-gray-200 hover:text-red-600 dark:hover:text-yellow-500 transition-all" data-action="copy-access" data-access="${card.access}" title="Copiar caminho de acesso" aria-label="Copiar caminho de acesso">
                        <span class="material-icons text-sm mr-1">content_copy</span>
                    </button>
                    <a href="${card.access}" target="_blank" class="text-gray-600 dark:text-gray-200 hover:text-red-600 dark:hover:text-yellow-500 truncate flex-1" title="Acessar ${this.escapeHTML(card.access)}">${this.escapeHTML(card.access)}</a>
                </div>
                ` : ''}
            </div>
        `;
        return div;
    }

    renderCards() {
        this.cardsContainer.innerHTML = '';
        const filteredCards = this.getFilteredCards();
        filteredCards.forEach(card => {
            this.cardsContainer.appendChild(this.createCardElement(card));
        });
    }

    getFilteredCards() {
        const search = this.searchInput.value.toLowerCase();
        const tag = this.tagFilter.value;
        const sort = this.sortOrder.value;

        let filtered = this.cards.filter(card => {
            const matchesSearch = card.name.toLowerCase().includes(search) ||
                card.description.toLowerCase().includes(search) ||
                card.code.toLowerCase().includes(search);
            const matchesTag = !tag || card.tag === tag;
            return matchesSearch && matchesTag;
        });

        filtered.sort((a, b) => {
            if (sort === 'name') return a.name.localeCompare(b.name);
            if (sort === 'lastEdited') return new Date(b.lastEdited) - new Date(a.lastEdited);
            if (sort === 'tag') return a.tag.localeCompare(b.tag);
            return 0;
        });

        return filtered;
    }

    updateCardCounts() {
        this.totalCards.textContent = this.cards.length;
        this.filteredCards.textContent = this.getFilteredCards().length;
    }

    updateLastUpdated() {
        const lastUpdated = document.getElementById('last-updated');
        const now = new Date();
        lastUpdated.textContent = `Última atualização: ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`;
    }

    openCardModal(cardId = null) {
        this.cardForm.reset();
        document.getElementById('card-id').value = cardId || '';
        document.getElementById('card-name').classList.remove('error');
        document.getElementById('card-name-error').classList.add('hidden');
        document.getElementById('card-youtube').classList.remove('error');
        document.getElementById('card-youtube-error').classList.add('hidden');
        document.getElementById('card-access').classList.remove('error');
        document.getElementById('card-access-error').classList.add('hidden');
        document.getElementById('card-description-counter').textContent = '0/200 caracteres';
        document.getElementById('card-image-preview').classList.add('hidden');
        document.getElementById('card-image-path').textContent = '';
        document.getElementById('card-image-input').dataset.url = '';
        document.getElementById('remove-image-btn').classList.add('hidden');
        // Set modal title based on whether editing or adding
        const modalTitle = document.getElementById('modal-title');
        modalTitle.textContent = cardId ? 'Editar Cartão' : 'Adicionar Cartão';

        if (cardId) {
            const card = this.cards.find(c => c.id === cardId);
            if (card) {
                document.getElementById('card-name').value = card.name;
                document.getElementById('card-tag').value = card.tag;
                document.getElementById('card-youtube').value = card.youtube;
                document.getElementById('card-access').value = card.access;
                document.getElementById('card-description').value = card.description;
                document.getElementById('card-description-counter').textContent = `${card.description.length}/200 caracteres`;
                if (card.image) {
                    document.getElementById('card-image-preview').src = card.image;
                    document.getElementById('card-image-preview').classList.remove('hidden');
                    document.getElementById('card-image-path').textContent = 'Imagem selecionada';
                    document.getElementById('card-image-input').dataset.url = card.image;
                    document.getElementById('remove-image-btn').classList.remove('hidden');
                }
            }
        }

        this.cardModal.classList.add('show');
    }

// Função para quebrar texto a cada 40 caracteres, respeitando palavras inteiras
breakTextAtInterval(text, interval = 50) {
    if (!text) return text;
    const words = text.split(' ');
    let currentLine = '';
    const lines = [];
    
    for (const word of words) {
        if ((currentLine + (currentLine ? ' ' : '') + word).length <= interval) {
            currentLine += (currentLine ? ' ' : '') + word;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine) lines.push(currentLine);
    
    return lines.join('\n');
}

openDetailsModal(cardId) {
    const card = this.cards.find(c => c.id === cardId);
    if (!card) return;

    document.getElementById('details-name').textContent = this.escapeHTML(card.name);
    document.getElementById('details-code').textContent = this.escapeHTML(card.code || 'Sem Código');
    // Aplica quebra de linha a cada 40 caracteres na descrição
    const formattedDescription = this.breakTextAtInterval(card.description || 'Sem descrição');
    document.getElementById('details-description').textContent = this.escapeHTML(formattedDescription);
    const youtubeLink = document.getElementById('details-youtube');
    youtubeLink.href = card.youtube || '#';
    youtubeLink.style.display = card.youtube ? 'inline-flex' : 'none';
    document.getElementById('details-created').textContent = new Date(card.created).toLocaleString('pt-BR');
    document.getElementById('details-last-edited').textContent = new Date(card.lastEdited).toLocaleString('pt-BR');
    const detailsImage = document.getElementById('details-image');
    detailsImage.src = card.image || 'https://via.placeholder.com/400x300';
    detailsImage.dataset.image = card.image || '';
    document.querySelectorAll('[data-action="open-image"]').forEach(el => {
        el.dataset.image = card.image || '';
    });

    const modalActions = document.querySelector('#details-modal .modal-actions');
    modalActions.innerHTML = ''; // No buttons in details modal

    this.detailsModal.classList.add('show');
}

    openDeleteModal(cardId) {
        const card = this.cards.find(c => c.id === cardId);
        if (!card) return;

        document.getElementById('delete-card-name').textContent = this.escapeHTML(card.name);
        document.getElementById('confirm-delete').onclick = () => {
            this.deleteCard(cardId);
            this.closeModal('delete');
        };

        this.deleteModal.classList.add('show');
    }

    openHelpModal() {
        this.helpModal.classList.add('show');
    }

    closeModal(type) {
        document.getElementById(`${type}-modal`).classList.remove('show');
    }

    filterCards() {
        this.renderCards();
        this.updateCardCounts();
        this.clearSearch.classList.toggle('hidden', !this.searchInput.value);
    }
}

// Export the class for use in other files
window.CardCatalogUI = CardCatalogUI;