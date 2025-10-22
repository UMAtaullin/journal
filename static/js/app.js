// Основной JavaScript файл для бурового журнала

class DrillingApp {
  constructor() {
    this.init();
  }

  init() {
    console.log('Буровой журнал инициализирован');
    this.setupEventListeners();
    this.loadWells();
    this.updateOnlineStatus(); // начальный статус
  }

  setupEventListeners() {
    // Слушаем изменения статуса сети
    window.addEventListener('online', () => this.updateOnlineStatus());
    window.addEventListener('offline', () => this.updateOnlineStatus());
  }

  updateOnlineStatus() {
    const statusElement = document.getElementById('status-text');
    if (!statusElement) return;

    if (navigator.onLine) {
      statusElement.textContent = '✅ Онлайн';
      statusElement.style.color = 'green';
    } else {
      statusElement.textContent = '⚠️ Оффлайн';
      statusElement.style.color = 'orange';
    }
  }

  // Загрузка скважин с API
  async loadWells() {
    try {
      console.log('Загрузка скважин...');
      const response = await fetch('/api/wells/my_wells/');

      if (response.ok) {
        const wells = await response.json();
        console.log('Загружены скважины:', wells);
        this.displayWells(wells);
      } else {
        console.error('Ошибка загрузки скважин:', response.status);
      }
    } catch (error) {
      console.error('Ошибка при загрузке скважин:', error);
      this.displayError('Не удалось загрузить скважины');
    }
  }

  // Отображение скважин в интерфейсе
  displayWells(wells) {
    const wellsList = document.getElementById('wells-list');
    if (!wellsList) return;

    if (wells.length === 0) {
      wellsList.innerHTML = '<p>Скважин пока нет</p>';
      return;
    }

    wellsList.innerHTML = wells.map(well => `
            <div class="well-item">
                <h3>${this.escapeHtml(well.name)}</h3>
                <p><strong>Участок:</strong> ${this.escapeHtml(well.area)}</p>
                <p><strong>Сооружение:</strong> ${this.escapeHtml(well.structure)}</p>
                <p><strong>Проектная глубина:</strong> ${well.design_depth} м</p>
                <p><small>Создана: ${new Date(well.created_at).toLocaleDateString()}</small></p>
            </div>
        `).join('');
  }

  displayError(message) {
    const wellsList = document.getElementById('wells-list');
    if (wellsList) {
      wellsList.innerHTML = `<p style="color: red;">${message}</p>`;
    }
  }

  // Безопасное экранирование HTML
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