// Основной JavaScript файл для бурового журнала
class DrillingApp {
  constructor() {
    this.offlineManager = new OfflineManager();
    this.isOnline = navigator.onLine;
    this.init();
  }

  async init() {
    console.log('Буровой журнал инициализирован');
    await this.offlineManager.init();
    this.setupEventListeners();
    await this.loadWells();
    this.updateOnlineStatus();
  }

  setupEventListeners() {
    // Слушаем изменения статуса сети
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    document.getElementById('show-form-btn').addEventListener('click', () => this.showForm());
    document.getElementById('cancel-form-btn').addEventListener('click', () => this.hideForm());
    document.getElementById('create-well-form').addEventListener('submit', (e) => this.handleFormSubmit(e));

    // Новые слушатели для модального окна слоев
    document.querySelector('.close').addEventListener('click', () => this.closeLayerModal());
    document.getElementById('cancel-layer-btn').addEventListener('click', () => this.closeLayerModal());
    document.getElementById('add-layer-form').addEventListener('submit', (e) => this.handleLayerFormSubmit(e));

    // Закрытие модального окна при клике вне его
    window.addEventListener('click', (e) => {
      if (e.target === document.getElementById('layer-modal')) {
        this.closeLayerModal();
      }
    });

    // Кнопка показа формы
    document.getElementById('show-form-btn').addEventListener('click', () => this.showForm());

    // Кнопка отмены формы
    document.getElementById('cancel-form-btn').addEventListener('click', () => this.hideForm());

    // Отправка формы
    document.getElementById('create-well-form').addEventListener('submit', (e) => this.handleFormSubmit(e));
  }

  // Показать модальное окно для добавления слоев
  showLayerModal(wellId, wellName) {
    document.getElementById('layer-modal').style.display = 'block';
    document.getElementById('modal-title').textContent = `Добавить слой для: ${wellName}`;
    document.getElementById('current-well-id').value = wellId;

    // Загружаем существующие слои для этой скважины
    this.loadLayersForWell(wellId);
  }

  // Закрыть модальное окно
  closeLayerModal() {
    document.getElementById('layer-modal').style.display = 'none';
    document.getElementById('add-layer-form').reset();
  }

  // Загрузка слоев для конкретной скважины
  async loadLayersForWell(wellId) {
    try {
      const layersList = document.getElementById('layers-list');
      layersList.innerHTML = '<p>Загрузка слоев...</p>';

      let layers;
      if (this.isOnline) {
        const response = await fetch(`/api/layers/well_layers/?well_id=${wellId}`);
        if (response.ok) {
          layers = await response.json();
        } else {
          throw new Error('Ошибка загрузки слоев');
        }
      } else {
        layers = await this.offlineManager.getLayersForWell(wellId);
      }

      this.displayLayers(layers);
    } catch (error) {
      console.error('Ошибка загрузки слоев:', error);
      document.getElementById('layers-list').innerHTML = '<p>Ошибка загрузки слоев</p>';
    }
  }

  // Отображение списка слоев
  displayLayers(layers) {
    const layersList = document.getElementById('layers-list');

    if (layers.length === 0) {
      layersList.innerHTML = '<p>Слоев пока нет. Добавьте первый слой.</p>';
      return;
    }

    layersList.innerHTML = `
        <table class="layers-table">
            <thead>
                <tr>
                    <th>Глубина от (м)</th>
                    <th>Глубина до (м)</th>
                    <th>Мощность (м)</th>
                    <th>Литология</th>
                    <th>Описание</th>
                </tr>
            </thead>
            <tbody>
                ${layers.map(layer => `
                    <tr>
                        <td>${layer.depth_from}</td>
                        <td>${layer.depth_to}</td>
                        <td><span class="thickness-badge">${layer.thickness}</span></td>
                        <td>${this.getLithologyDisplay(layer.lithology)}</td>
                        <td>${layer.description || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
  }

  // Получить отображаемое название литологии
  getLithologyDisplay(lithology) {
    const lithologyMap = {
      'prs': 'ПРС',
      'peat': 'Торф',
      'loam': 'Суглинок',
      'sandy_loam': 'Супесь',
      'sand': 'Песок'
    };
    return lithologyMap[lithology] || lithology;
  }

  // Обработка отправки формы слоя
  async handleLayerFormSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const wellId = document.getElementById('current-well-id').value;

    const layerData = {
      well: wellId,
      depth_from: parseFloat(formData.get('depth_from')),
      depth_to: parseFloat(formData.get('depth_to')),
      lithology: formData.get('lithology'),
      description: formData.get('description')
    };

    // Валидация: глубина "до" должна быть больше глубины "от"
    if (layerData.depth_to <= layerData.depth_from) {
      this.showMessage('Глубина "до" должна быть больше глубины "от"', 'error');
      return;
    }

    if (this.isOnline) {
      await this.createLayerOnline(layerData);
    } else {
      await this.createLayerOffline(layerData);
    }
  }

  // Создание слоя в онлайн режиме
  async createLayerOnline(layerData) {
    try {
      const response = await fetch('/api/layers/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': this.getCSRFToken(),
        },
        body: JSON.stringify(layerData)
      });

      if (response.ok) {
        const newLayer = await response.json();
        console.log('Слой создан на сервере:', newLayer);

        this.showMessage('Слой успешно добавлен!', 'success');
        document.getElementById('add-layer-form').reset();
        await this.loadLayersForWell(layerData.well);
      } else {
        const errorData = await response.json();
        console.error('Ошибка создания слоя:', errorData);
        this.showMessage('Ошибка при добавлении слоя', 'error');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      await this.createLayerOffline(layerData);
    }
  }

  // Создание слоя в оффлайн режиме
  async createLayerOffline(layerData) {
    try {
      const localLayer = await this.offlineManager.saveLayer(layerData);

      this.showMessage('Слой сохранен локально (оффлайн режим)', 'success');
      document.getElementById('add-layer-form').reset();
      await this.loadLayersForWell(layerData.well);
    } catch (error) {
      console.error('Ошибка сохранения слоя локально:', error);
      this.showMessage('Ошибка сохранения слоя', 'error');
    }
  }

  // Обновим метод displayWells чтобы добавить кнопки управления слоями
  displayWells(wells) {
    const wellsList = document.getElementById('wells-list');
    if (!wellsList) return;

    if (wells.length === 0) {
      wellsList.innerHTML = '<p>Скважин пока нет. Нажмите "Создать скважину" чтобы добавить первую.</p>';
      return;
    }

    wellsList.innerHTML = wells.map(well => `
        <div class="well-item">
            <h3>${this.escapeHtml(well.name)}</h3>
            <p><strong>Участок:</strong> ${this.escapeHtml(well.area)}</p>
            <p><strong>Сооружение:</strong> ${this.escapeHtml(well.structure)}</p>
            <p><strong>Проектная глубина:</strong> ${well.design_depth} м</p>
            <p><small>Создана: ${new Date(well.created_at).toLocaleDateString()}</small></p>
            ${well.sync_status === 'pending' ? '<p style="color: orange;">⚠️ Ожидает синхронизации</p>' : ''}
            
            <div class="well-actions">
                <button class="btn-add-layer" onclick="drillingApp.showLayerModal('${well.id || well.offline_id}', '${this.escapeHtml(well.name)}')">
                    Добавить слой
                </button>
                <button class="btn-view-layers" onclick="drillingApp.showLayerModal('${well.id || well.offline_id}', '${this.escapeHtml(well.name)}')">
                    Просмотреть слои
                </button>
            </div>
        </div>
    `).join('');
  }

  // Обработчик перехода в онлайн
  async handleOnline() {
    console.log('Переход в онлайн режим');
    this.isOnline = true;
    this.updateOnlineStatus();

    // Пытаемся синхронизировать оффлайн-данные
    await this.syncOfflineData();
    // Загружаем актуальные данные с сервера
    await this.loadWells();
  }

  // Обработчик перехода в оффлайн
  async handleOffline() {
    console.log('Переход в оффлайн режим');
    this.isOnline = false;
    this.updateOnlineStatus();

    // Просто показываем локальные данные
    await this.loadWells();
  }

  // Синхронизация оффлайн-данных с сервером
  async syncOfflineData() {
    try {
      const localWells = await this.offlineManager.getLocalWells();
      const pendingWells = localWells.filter(well => well.sync_status === 'pending');

      if (pendingWells.length === 0) {
        console.log('Нет данных для синхронизации');
        return;
      }

      console.log('Синхронизация оффлайн-данных:', pendingWells.length, 'скважин');

      for (const well of pendingWells) {
        try {
          const response = await fetch('/api/wells/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': this.getCSRFToken(),
            },
            body: JSON.stringify({
              name: well.name,
              area: well.area,
              structure: well.structure,
              design_depth: well.design_depth,
              offline_id: well.offline_id
            })
          });

          if (response.ok) {
            // Удаляем из локальной базы после успешной синхронизации
            await this.offlineManager.deleteWell(well.offline_id);
            console.log('Скважина синхронизирована:', well.name);
          } else {
            console.error('Ошибка синхронизации скважины:', well.name);
          }
        } catch (error) {
          console.error('Ошибка при синхронизации скважины:', well.name, error);
        }
      }

      this.showMessage(`Синхронизировано ${pendingWells.length} скважин`, 'success');
    } catch (error) {
      console.error('Ошибка синхронизации:', error);
      this.showMessage('Ошибка синхронизации данных', 'error');
    }
  }

  // Обработка отправки формы (работает в онлайн и оффлайн)
  async handleFormSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const wellData = {
      name: formData.get('name'),
      area: formData.get('area'),
      structure: formData.get('structure'),
      design_depth: parseFloat(formData.get('design_depth'))
    };

    if (this.isOnline) {
      // Онлайн режим - отправляем на сервер
      await this.createWellOnline(wellData);
    } else {
      // Оффлайн режим - сохраняем локально
      await this.createWellOffline(wellData);
    }
  }

  // Создание скважины в онлайн режиме
  async createWellOnline(wellData) {
    try {
      console.log('Создание скважины онлайн:', wellData);

      const response = await fetch('/api/wells/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': this.getCSRFToken(),
        },
        body: JSON.stringify(wellData)
      });

      if (response.ok) {
        const newWell = await response.json();
        console.log('Скважина создана на сервере:', newWell);

        this.showMessage('Скважина успешно создана!', 'success');
        this.hideForm();
        await this.loadWells();
      } else {
        const errorData = await response.json();
        console.error('Ошибка создания скважины:', errorData);
        this.showMessage('Ошибка при создании скважины', 'error');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      // При ошибке сети пробуем сохранить локально
      await this.createWellOffline(wellData);
    }
  }

  // Создание скважины в оффлайн режиме
  async createWellOffline(wellData) {
    try {
      console.log('Создание скважины оффлайн:', wellData);

      const localWell = await this.offlineManager.saveWell(wellData);

      this.showMessage('Скважина сохранена локально (оффлайн режим)', 'success');
      this.hideForm();
      await this.loadWells(); // Обновляем список локальных данных
    } catch (error) {
      console.error('Ошибка сохранения локально:', error);
      this.showMessage('Ошибка сохранения скважины', 'error');
    }
  }

  // Загрузка скважин (из сервера или локальной базы)
  async loadWells() {
    try {
      if (this.isOnline) {
        // Онлайн режим - загружаем с сервера
        console.log('Загрузка скважин с сервера...');
        const response = await fetch('/api/wells/my_wells/');

        if (response.ok) {
          const wells = await response.json();
          console.log('Загружены скважины с сервера:', wells.length);
          this.displayWells(wells);
        } else {
          throw new Error('Ошибка загрузки с сервера');
        }
      } else {
        // Оффлайн режим - загружаем из локальной базы
        console.log('Загрузка локальных скважин...');
        const localWells = await this.offlineManager.getLocalWells();
        console.log('Загружены локальные скважины:', localWells.length);
        this.displayWells(localWells);
      }
    } catch (error) {
      console.error('Ошибка при загрузке скважин:', error);

      // При ошибке пробуем загрузить локальные данные
      try {
        const localWells = await this.offlineManager.getLocalWells();
        this.displayWells(localWells);
        this.showMessage('Оффлайн режим. Используются локальные данные', 'info');
      } catch (localError) {
        this.displayError('Не удалось загрузить скважины');
      }
    }
  }

  // Обновление статуса онлайн/оффлайн
  updateOnlineStatus() {
    const statusElement = document.getElementById('status-text');
    if (!statusElement) return;

    if (this.isOnline) {
      statusElement.textContent = '✅ Онлайн';
      statusElement.style.color = 'green';
    } else {
      statusElement.textContent = '⚠️ Оффлайн';
      statusElement.style.color = 'orange';
    }
  }

  // Остальные методы остаются без изменений...
  showForm() {
    document.getElementById('well-form-container').style.display = 'block';
    document.getElementById('show-form-btn').style.display = 'none';
  }

  hideForm() {
    document.getElementById('well-form-container').style.display = 'none';
    document.getElementById('show-form-btn').style.display = 'block';
    document.getElementById('create-well-form').reset();
  }

  getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]').value;
  }

  showMessage(text, type) {
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;

    const formContainer = document.getElementById('well-form-container');
    formContainer.parentNode.insertBefore(messageDiv, formContainer);

    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 5000);
  }

  displayWells(wells) {
    const wellsList = document.getElementById('wells-list');
    if (!wellsList) return;

    if (wells.length === 0) {
      wellsList.innerHTML = '<p>Скважин пока нет. Нажмите "Создать скважину" чтобы добавить первую.</p>';
      return;
    }

    wellsList.innerHTML = wells.map(well => `
            <div class="well-item">
                <h3>${this.escapeHtml(well.name)}</h3>
                <p><strong>Участок:</strong> ${this.escapeHtml(well.area)}</p>
                <p><strong>Сооружение:</strong> ${this.escapeHtml(well.structure)}</p>
                <p><strong>Проектная глубина:</strong> ${well.design_depth} м</p>
                <p><small>Создана: ${new Date(well.created_at).toLocaleDateString()}</small></p>
                ${well.sync_status === 'pending' ? '<p style="color: orange;">⚠️ Ожидает синхронизации</p>' : ''}
            </div>
        `).join('');
  }

  displayError(message) {
    const wellsList = document.getElementById('wells-list');
    if (wellsList) {
      wellsList.innerHTML = `<p style="color: red;">${message}</p>`;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Инициализация при полной загрузке DOM
document.addEventListener('DOMContentLoaded', function () {
  window.drillingApp = new DrillingApp();
});