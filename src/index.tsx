import "react-app-polyfill/ie11";
import "react-app-polyfill/stable";

import { createRoot } from "react-dom/client";

import "./index.less";

import App from "./App";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
