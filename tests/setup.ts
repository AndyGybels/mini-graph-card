// Test setup file
import "@testing-library/dom";

// Mock @kalkih/lz-string
jest.mock("@kalkih/lz-string", () => ({
  compress: jest.fn((str: string) => `compressed:${str}`),
  decompress: jest.fn((str: string) => str.replace("compressed:", "")),
}));

// Mock custom-card-helpers
jest.mock("custom-card-helpers", () => ({
  stateIcon: jest.fn((entity) => entity?.attributes?.icon || "mdi:help"),
}));

// Setup global mocks if needed
global.customElements = {
  define: jest.fn(),
  get: jest.fn(),
} as any;

// Mock window.customCards
(global as any).window = {
  customCards: [],
};
