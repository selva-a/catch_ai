export class AIService {
  constructor() {
    this.isActive = false;
    this.name = "Base Service";
    this.icon = "⚙️";
    this.description = "";
  }

  activate() {
    this.isActive = true;
    this.showIndicator();
    return this.onActivate();
  }

  deactivate() {
    this.isActive = false;
    this.hideIndicator();
    return this.onDeactivate();
  }

  onActivate() {}
  onDeactivate() {}

  getSystemPrompt() {
    return "";
  }

  shouldHandle(message) {
    return false;
  }

  showIndicator() {
    const indicator = document.getElementById('serviceIndicator');
    if (indicator) {
      indicator.innerHTML = `
        <div class="service-indicator-content">
          <span class="service-icon">${this.icon}</span>
          <span class="service-name">${this.name}</span>
        </div>
      `;
      indicator.style.display = 'flex';
    }
  }

  hideIndicator() {
    const indicator = document.getElementById('serviceIndicator');
    if (indicator) indicator.style.display = 'none';
  }
}