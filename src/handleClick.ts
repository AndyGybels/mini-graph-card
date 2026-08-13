import {
  MiniGraphCardConfig,
  HomeAssistant,
  TapAction,
} from "./types";

export default (
  node: HTMLElement,
  hass: HomeAssistant,
  config: MiniGraphCardConfig,
  actionConfig: TapAction,
  entityId: string | undefined
): void => {
  switch (actionConfig.action) {
    case "more-info": {
      const e = new CustomEvent("hass-more-info", {
        composed: true,
        detail: { entityId },
      });
      node.dispatchEvent(e);
      break;
    }
    case "navigate": {
      if (!actionConfig.navigation_path) return;
      window.history.pushState(null, "", actionConfig.navigation_path);
      const e = new CustomEvent("location-changed", {
        composed: true,
        detail: { replace: false },
      });
      window.dispatchEvent(e);
      break;
    }
    case "call-service": {
      if (!actionConfig.service) return;
      const [domain, service] = actionConfig.service.split(".", 2);
      const serviceData = { ...actionConfig.service_data };
      hass.callService(domain, service, serviceData);
      break;
    }
    case "url": {
      if (!actionConfig.url) return;
      window.location.href = actionConfig.url;
      break;
    }
    case "fire-dom-event": {
      const e = new CustomEvent("ll-custom", {
        composed: true,
        bubbles: true,
        detail: actionConfig,
      });
      node.dispatchEvent(e);
      break;
    }
    default:
      break;
  }
};
