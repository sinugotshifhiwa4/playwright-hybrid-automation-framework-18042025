export default class EnvironmentDetector {

  
  public static isRunningInCIEnvironment(): boolean {
    return !!(
      process.env.CI || // Standard CI variable
      process.env.GITHUB_ACTIONS ||
      process.env.GITLAB_CI ||
      process.env.TRAVIS ||
      process.env.CIRCLECI ||
      process.env.JENKINS_URL ||
      process.env.BITBUCKET_BUILD_NUMBER
    );
  }
}
