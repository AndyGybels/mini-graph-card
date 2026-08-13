/**
 * EntitySubscription controller tests
 */

import { EntitySubscription } from "../src/controllers/entitySubscription";

function makeHost(): any {
  return {
    isConnected: true,
    addController: jest.fn(),
    requestUpdate: jest.fn(),
  };
}

describe("EntitySubscription", () => {
  test("does not throw when the store subscription fails, and retries on next sync", async () => {
    const subscribe = jest
      .fn()
      .mockRejectedValueOnce(new Error("ws down"))
      .mockResolvedValueOnce({ configId: "abc", unsubscribe: jest.fn() });
    const store: any = { subscribe };

    const controller = new EntitySubscription(makeHost(), {
      store: () => store,
      config: () => ({ entities: ["sensor.a"] }) as any,
      onUpdate: () => {},
    });

    await expect(controller.sync()).resolves.toBeUndefined();
    expect(controller.configId).toBeUndefined();

    await controller.sync();
    expect(controller.configId).toBe("abc");
    expect(subscribe).toHaveBeenCalledTimes(2);
  });
});
