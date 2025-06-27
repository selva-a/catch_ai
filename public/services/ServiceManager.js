import { AIService } from './AIService.js';

export class ServiceManager {
  constructor() {
    this.services = new Map();
    this.activeService = null;
  }

  registerService(key, service) {
    if (!(service instanceof AIService)) {
      throw new Error('Service must extend AIService');
    }
    this.services.set(key, service);
  }

  async setActiveService(key) {
    if (this.activeService) {
      await this.activeService.deactivate();
    }

    const service = this.services.get(key);
    if (!service) throw new Error(`Service ${key} not found`);

    this.activeService = service;
    await service.activate();
    return service;
  }

  getActiveService() {
    return this.activeService;
  }

  getServicesList() {
    return Array.from(this.services.entries()).map(([key, service]) => ({
      key,
      name: service.name,
      icon: service.icon,
      description: service.description
    }));
  }
}