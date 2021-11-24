import axios from "axios";
import config from "./dev.json";
import { Amplify } from "@aws-amplify/core";
import { buildConfig } from "./aws-exports";

interface ProxyConfig {
  applicationConfig: ApplicationConfig;
  authenticationConfig: AuthenticationConfig;
}

interface ApplicationConfig {
  apiUrl: string;
}

interface AuthenticationConfig {
  userPoolId: string;
  userPoolClientId: string;
  awsRegion: string;
  cognitoDomain: string;
}

export interface ATATConfiguration {
  apiUrl: string;
  userPoolId: string;
  userPoolClientId: string;
  awsRegion: string;
  cognitoDomain: string;
}

const atatConfigKey = "atat-config";

const retrieveSessionConfig = (): ATATConfiguration | undefined => {
  const storedConfiguration = sessionStorage.getItem(atatConfigKey);
  if (storedConfiguration) {
    const atatConfig = JSON.parse(storedConfiguration) as ATATConfiguration;
    return atatConfig;
  }

  return undefined;
};

const buildConfigurationUrl = (): string => {
  const origin = window.location.origin;
  const basePath = process.env.BASE_URL;
  const endpoint = "configuration";
  return `${origin}${basePath}${endpoint}`;
};

const getConfiguration = async (): Promise<ATATConfiguration> => {
  let atatConfig: ATATConfiguration;

  const retrievedConfig = retrieveSessionConfig();

  if (retrievedConfig) {
    atatConfig = retrievedConfig;
    return atatConfig;
  }

  if (window.location.hostname === "localhost") {
    atatConfig = {
      apiUrl: config.applicationConfig.apiUrl,
      userPoolId: config.authenticationConfig.userPoolId,
      userPoolClientId: config.authenticationConfig.userPoolClientId,
      awsRegion: config.authenticationConfig.awsRegion,
      cognitoDomain: config.authenticationConfig.cognitoDomain,
    };

    sessionStorage.setItem(atatConfigKey, JSON.stringify(atatConfig));

    return atatConfig;
  }

  const configurationUrl = buildConfigurationUrl();

  try {
    const response = await axios.get<ProxyConfig>(configurationUrl);

    const proxy = response.data;

    atatConfig = {
      apiUrl: proxy.applicationConfig.apiUrl,
      userPoolId: proxy.authenticationConfig.userPoolId,
      userPoolClientId: proxy.authenticationConfig.userPoolClientId,
      awsRegion: proxy.authenticationConfig.awsRegion,
      cognitoDomain: proxy.authenticationConfig.cognitoDomain,
    };

    sessionStorage.setItem(atatConfigKey, JSON.stringify(atatConfig));

    return atatConfig;
  } catch (error) {
    throw new Error("unable to retrieve config");
  }
};

const buildConfiguration = async (): Promise<void> => {
  const config = await getConfiguration();
  const amplifyConfig = buildConfig(config);
  Amplify.configure(amplifyConfig);
};

export { buildConfiguration, getConfiguration, retrieveSessionConfig };