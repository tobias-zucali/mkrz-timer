import config from "./playwright.agent.config"

const noWebServerConfig = {
  ...config,
  webServer: undefined,
}

export default noWebServerConfig
