declare module "@serverless-chrome/lambda" {
  interface LauncherOptions {
    flags?: string[];
  }

  interface ChromeInstance {
    pid: number;
    port: number;
    url: string;
    kill: () => Promise<void>;
    log: string;
    errorLog: string;
    pidFile: string;
    metaData: {
      launchTime: number, // as timestamp
      didLaunch: boolean;
    };
  }

  const launchChrome: (options?: LauncherOptions) => Promise<ChromeInstance>;

  export = launchChrome;
}
