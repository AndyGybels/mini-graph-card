import "./initialize";
import "./components/mini-graph-card";

// Configure the preview in the Lovelace card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "mini-graph-card",
  name: "Mini Graph Card",
  preview: false,
  description:
    "The Mini Graph card is a minimalistic and customizable graph card",
});
