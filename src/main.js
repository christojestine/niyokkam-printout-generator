/**
 * main.js
 *
 * Entry point — mounts the React app into #root.
 */

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";

const root = createRoot(document.getElementById("root"));
root.render(createElement(App));
