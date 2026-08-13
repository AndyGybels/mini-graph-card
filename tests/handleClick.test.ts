/**
 * handleClick Test Suite
 *
 * Tests for tap_action handling (more-info, navigate, call-service, url,
 * fire-dom-event).
 */

import handleClick from "../src/handleClick";

function makeNode() {
  return { dispatchEvent: jest.fn() } as any;
}

describe("handleClick", () => {
  test("more-info dispatches hass-more-info with the entity id", () => {
    const node = makeNode();
    handleClick(node, {} as any, {} as any, { action: "more-info" }, "sensor.a");

    expect(node.dispatchEvent).toHaveBeenCalledTimes(1);
    const event = node.dispatchEvent.mock.calls[0][0];
    expect(event.type).toBe("hass-more-info");
    expect(event.detail).toEqual({ entityId: "sensor.a" });
  });

  test("call-service calls the hass service with service data", () => {
    const hass = { callService: jest.fn() } as any;
    handleClick(
      makeNode(),
      hass,
      {} as any,
      {
        action: "call-service",
        service: "light.turn_on",
        service_data: { entity_id: "light.a" },
      },
      "sensor.a"
    );

    expect(hass.callService).toHaveBeenCalledWith("light", "turn_on", {
      entity_id: "light.a",
    });
  });

  test("call-service without a service does nothing", () => {
    const hass = { callService: jest.fn() } as any;
    handleClick(
      makeNode(),
      hass,
      {} as any,
      { action: "call-service" },
      "sensor.a"
    );
    expect(hass.callService).not.toHaveBeenCalled();
  });

  test("fire-dom-event dispatches ll-custom with the action config", () => {
    const node = makeNode();
    const actionConfig = { action: "fire-dom-event", browser_mod: {} };
    handleClick(node, {} as any, {} as any, actionConfig as any, "sensor.a");

    const event = node.dispatchEvent.mock.calls[0][0];
    expect(event.type).toBe("ll-custom");
    expect(event.detail).toBe(actionConfig);
  });

  test("none action does nothing", () => {
    const node = makeNode();
    handleClick(node, {} as any, {} as any, { action: "none" }, "sensor.a");
    expect(node.dispatchEvent).not.toHaveBeenCalled();
  });
});
