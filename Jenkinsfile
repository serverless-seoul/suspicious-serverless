MAIN_BRANCH = 'master'
IS_MASTER_BUILD = (env.BRANCH_NAME == MAIN_BRANCH)

node(label: 'Small') {
  catchError {
    withDockerRegistry(registry: [credentialsId: 'docker-hub', url: 'https://index.docker.io/v1/']) {
      docker.image('vingle/lambda-microservice-template:chrome').pull()
      withDockerContainer([image: 'vingle/lambda-microservice-template:chrome']) {
        stage('Checkout SCM') {
          checkout scm

          step([$class: 'GitHubSetCommitStatusBuilder'])
        }

        stage('Check Dependencies') {
          sh 'npm install --cache=./.npm --quiet'
        }

        stage('Lint') {
          sh 'npm run lint'
        }

        stage('Test') {
          sh 'npm run test'
        }

        if (IS_MASTER_BUILD) {
          withCredentials([
            [
              $class: 'AmazonWebServicesCredentialsBinding',
              credentialsId: 'jenkins iam',
              accessKeyVariable: 'AWS_ACCESS_KEY_ID',
              secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
            ]
          ]) {
            stage('deploy:stage') {
              sh 'npm run deploy:stage'
              sh 'npm run deploy:stage -- --region=ap-northeast-2'
            }

            stage('deploy:prod') {
              sh 'npm run deploy:prod'
              sh 'npm run deploy:prod -- --region=ap-northeast-2'
            }
          }
        }
      }
    }
    currentBuild.result = 'SUCCESS'
  }

  step([
    $class: 'GitHubCommitStatusSetter',
    errorHandlers: [
      [$class: 'ShallowAnyErrorHandler']
    ],
    statusResultSource: [
      $class: 'ConditionalStatusResultSource',
      results: [
        [$class: 'BetterThanOrEqualBuildResult', result: 'SUCCESS', state: 'SUCCESS', message: currentBuild.description],
        [$class: 'BetterThanOrEqualBuildResult', result: 'FAILURE', state: 'FAILURE', message: currentBuild.description],
        [$class: 'AnyBuildResult', state: 'FAILURE', message: 'Loophole']
      ]
    ]
  ])
}
