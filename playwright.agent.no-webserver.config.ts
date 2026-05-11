import config from "./playwright.agent.config"

const noWebServerConfig = {
  ...config,
  // Attach mode targets an already-running tracked agent lane.
  webServer: undefined,
}

export default noWebServerConfig
